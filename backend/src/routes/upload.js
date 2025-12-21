const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, '..', '..', 'uploads');
    
    if (file.fieldname === 'logo') {
      uploadPath = path.join(uploadPath, 'logos');
    } else if (file.fieldname === 'signature') {
      uploadPath = path.join(uploadPath, 'signatures');
    }
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
  }
};

const csvFilter = (req, file, cb) => {
  const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
  const allowedExtensions = ['.csv', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadCSV = multer({
  storage: multer.memoryStorage(),
  fileFilter: csvFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload logo
router.post('/logo', authenticateToken, uploadImage.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const relativePath = `/uploads/logos/${req.file.filename}`;
  res.json({ path: relativePath, filename: req.file.filename });
});

// Upload signature
router.post('/signature', authenticateToken, uploadImage.single('signature'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const relativePath = `/uploads/signatures/${req.file.filename}`;
  res.json({ path: relativePath, filename: req.file.filename });
});

// Upload and parse CSV for employees (admin only)
// Expected CSV format: Displayname, mail, Manager, Account, Description, employeeType, Department
router.post('/employees-csv', authenticateToken, requireAdmin, uploadCSV.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  try {
    const csvContent = req.file.buffer.toString('utf8');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or has no data rows' });
    }
    
    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.trim());
    const headersLower = headers.map(h => h.toLowerCase());
    
    // Map headers to expected fields
    // Supports both original format and Integrant format
    const fieldMapping = {
      'name': ['displayname', 'name', 'full_name', 'fullname', 'employee_name', 'full name', 'employee name'],
      'email': ['mail', 'email', 'e-mail', 'email address'],
      'manager_name': ['manager', 'manager_name', 'supervisor', 'manager name'],
      'account': ['account', 'project', 'client'],
      'position': ['description', 'position', 'title', 'job_title', 'role', 'job title'],
      'employee_type': ['employeetype', 'employee_type', 'type', 'employment type', 'employment_type'],
      'department': ['department', 'dept', 'division'],
      'employee_id': ['employee_id', 'employeeid', 'emp_id', 'id']
    };
    
    const headerIndices = {};
    for (const [field, aliases] of Object.entries(fieldMapping)) {
      const index = headersLower.findIndex(h => aliases.includes(h));
      if (index !== -1) {
        headerIndices[field] = index;
      }
    }
    
    // Validate required fields (name and email are required)
    if (headerIndices.email === undefined) {
      return res.status(400).json({ 
        error: 'CSV must contain an email column (mail, email, or e-mail)',
        detectedHeaders: headers
      });
    }
    
    if (headerIndices.name === undefined) {
      return res.status(400).json({ 
        error: 'CSV must contain a name column (Displayname, name, or full_name)',
        detectedHeaders: headers
      });
    }
    
    // Parse data rows
    const employees = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      if (values.length === 0 || values.every(v => !v.trim())) continue;
      
      const employee = {};
      for (const [field, index] of Object.entries(headerIndices)) {
        const value = values[index]?.trim();
        employee[field] = value || null;
      }
      
      // Validate required fields
      if (!employee.email || !employee.name) {
        errors.push({
          row: i + 1,
          data: values,
          error: 'Missing required field (name or email)'
        });
        continue;
      }
      
      // Use email as employee_id if not provided
      if (!employee.employee_id) {
        employee.employee_id = employee.email;
      }
      
      // Map to the format expected by the bulk create endpoint
      employees.push({
        Displayname: employee.name,
        mail: employee.email,
        Manager: employee.manager_name,
        Account: employee.account,
        Description: employee.position,
        employeeType: employee.employee_type,
        Department: employee.department,
        employee_id: employee.employee_id
      });
    }
    
    res.json({
      message: `Parsed ${employees.length} employees from CSV`,
      employees,
      headers: headers,
      mappedFields: Object.keys(headerIndices),
      parseErrors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      totalParseErrors: errors.length
    });
  } catch (error) {
    console.error('CSV parsing error:', error);
    res.status(500).json({ error: 'Failed to parse CSV file' });
  }
});

// Helper function to parse CSV line (handles quoted values)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Delete uploaded file
router.delete('/:type/:filename', authenticateToken, (req, res) => {
  const { type, filename } = req.params;
  
  const allowedTypes = ['logos', 'signatures'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  
  const filePath = path.join(__dirname, '..', '..', 'uploads', type, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
