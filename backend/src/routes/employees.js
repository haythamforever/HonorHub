const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all employees (filtered by user assignments for non-admin users)
router.get('/', authenticateToken, (req, res) => {
  const { search, department, account, all } = req.query;
  const isAdmin = req.user.role === 'admin';
  
  let query = '';
  const params = [];
  
  // Admins can see all employees, regular users only see their assigned employees
  // Unless 'all' is requested by admin for assignment purposes
  if (isAdmin && all === 'true') {
    query = 'SELECT * FROM employees WHERE 1=1';
  } else if (isAdmin) {
    query = 'SELECT * FROM employees WHERE 1=1';
  } else {
    // Non-admin: only see assigned employees
    query = `
      SELECT e.* FROM employees e
      INNER JOIN user_employees ue ON e.id = ue.employee_id
      WHERE ue.user_id = ?
    `;
    params.push(req.user.id);
  }
  
  if (search) {
    query += ' AND (e.name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  if (department) {
    query += ' AND e.department = ?';
    params.push(department);
  }
  
  if (account) {
    query += ' AND e.account = ?';
    params.push(account);
  }
  
  // Fix column reference for non-admin queries
  if (!isAdmin) {
    query = query.replace(/AND \(e\./g, 'AND (e.');
  } else {
    // For admin queries without join, use direct column names
    query = query.replace(/e\./g, '');
  }
  
  query += ' ORDER BY name ASC';
  
  const employees = db.prepare(query).all(...params);
  res.json(employees);
});

// Get unique accounts
router.get('/meta/accounts', authenticateToken, (req, res) => {
  const accounts = db.prepare('SELECT DISTINCT account FROM employees WHERE account IS NOT NULL ORDER BY account').all();
  res.json(accounts.map(a => a.account));
});

// Get unique departments
router.get('/meta/departments', authenticateToken, (req, res) => {
  const departments = db.prepare('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department').all();
  res.json(departments.map(d => d.department));
});

// Get employee by ID
router.get('/:id', authenticateToken, (req, res) => {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  // Check access for non-admin users
  if (req.user.role !== 'admin') {
    const hasAccess = db.prepare(
      'SELECT 1 FROM user_employees WHERE user_id = ? AND employee_id = ?'
    ).get(req.user.id, req.params.id);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this employee' });
    }
  }
  
  res.json(employee);
});

// Create employee (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('name').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { employee_id, email, name, department, position, manager_name, account, employee_type } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO employees (employee_id, email, name, department, position, manager_name, account, employee_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_id || null, 
      email, 
      name, 
      department || null, 
      position || null, 
      manager_name || null,
      account || null,
      employee_type || null
    );
    
    res.status(201).json({
      id: result.lastInsertRowid,
      employee_id,
      email,
      name,
      department,
      position,
      manager_name,
      account,
      employee_type
    });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Bulk create/update employees from CSV (admin only)
// CSV format: Displayname, mail, Manager, Account, Description, employeeType, Department
router.post('/bulk', authenticateToken, requireAdmin, (req, res) => {
  const { employees } = req.body;
  
  if (!Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({ error: 'Invalid employees data' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO employees (employee_id, email, name, department, position, manager_name, account, employee_type) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      department = excluded.department,
      position = excluded.position,
      manager_name = excluded.manager_name,
      account = excluded.account,
      employee_type = excluded.employee_type,
      updated_at = CURRENT_TIMESTAMP
  `);

  const results = { success: 0, failed: 0, errors: [] };

  const insertMany = db.transaction((emps) => {
    for (const emp of emps) {
      try {
        // Map CSV columns to database fields
        const name = emp.Displayname || emp.displayname || emp.name;
        const email = emp.mail || emp.email;
        const manager = emp.Manager || emp.manager || emp.manager_name;
        const account = emp.Account || emp.account;
        const position = emp.Description || emp.description || emp.position;
        const employeeType = emp.employeeType || emp.employee_type;
        const department = emp.Department || emp.department;
        
        if (!email || !name) {
          results.failed++;
          results.errors.push({ employee: emp, error: 'Missing required fields (name/Displayname, mail/email)' });
          continue;
        }
        
        // Use email as employee_id if not provided
        const employeeId = emp.employee_id || email;
        
        insertStmt.run(
          employeeId,
          email,
          name,
          department || null,
          position || null,
          manager || null,
          account || null,
          employeeType || null
        );
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ employee: emp, error: error.message });
      }
    }
  });

  insertMany(employees);
  
  res.json({
    message: `Imported ${results.success} employees`,
    ...results
  });
});

// Update employee (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { employee_id, email, name, department, position, manager_name, account, employee_type } = req.body;
  
  const updates = [];
  const values = [];
  
  if (employee_id !== undefined) {
    updates.push('employee_id = ?');
    values.push(employee_id);
  }
  if (email) {
    updates.push('email = ?');
    values.push(email);
  }
  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (department !== undefined) {
    updates.push('department = ?');
    values.push(department);
  }
  if (position !== undefined) {
    updates.push('position = ?');
    values.push(position);
  }
  if (manager_name !== undefined) {
    updates.push('manager_name = ?');
    values.push(manager_name);
  }
  if (account !== undefined) {
    updates.push('account = ?');
    values.push(account);
  }
  if (employee_type !== undefined) {
    updates.push('employee_type = ?');
    values.push(employee_type);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);
  
  try {
    db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    res.json(employee);
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  res.json({ message: 'Employee deleted successfully' });
});

// ============================================
// User-Employee Assignment Routes (admin only)
// ============================================

// Get all employees assigned to a specific user
router.get('/assignments/user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const employees = db.prepare(`
    SELECT e.*, ue.assigned_at 
    FROM employees e
    INNER JOIN user_employees ue ON e.id = ue.employee_id
    WHERE ue.user_id = ?
    ORDER BY e.name ASC
  `).all(req.params.userId);
  
  res.json(employees);
});

// Assign employees to a user
router.post('/assignments/user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { employee_ids } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'employee_ids must be an array' });
  }
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO user_employees (user_id, employee_id, assigned_by)
    VALUES (?, ?, ?)
  `);
  
  const results = { assigned: 0, errors: [] };
  
  const assignMany = db.transaction((ids) => {
    for (const empId of ids) {
      try {
        const result = insertStmt.run(userId, empId, req.user.id);
        if (result.changes > 0) {
          results.assigned++;
        }
      } catch (error) {
        results.errors.push({ employee_id: empId, error: error.message });
      }
    }
  });
  
  assignMany(employee_ids);
  
  res.json({
    message: `Assigned ${results.assigned} employees to user`,
    ...results
  });
});

// Remove employee assignments from a user
router.delete('/assignments/user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { employee_ids } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'employee_ids must be an array' });
  }
  
  const deleteStmt = db.prepare(`
    DELETE FROM user_employees WHERE user_id = ? AND employee_id = ?
  `);
  
  let removed = 0;
  
  const removeMany = db.transaction((ids) => {
    for (const empId of ids) {
      const result = deleteStmt.run(userId, empId);
      removed += result.changes;
    }
  });
  
  removeMany(employee_ids);
  
  res.json({
    message: `Removed ${removed} employee assignments`,
    removed
  });
});

// Replace all employee assignments for a user
router.put('/assignments/user/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { employee_ids } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'employee_ids must be an array' });
  }
  
  const replaceAssignments = db.transaction(() => {
    // Remove all existing assignments
    db.prepare('DELETE FROM user_employees WHERE user_id = ?').run(userId);
    
    // Add new assignments
    const insertStmt = db.prepare(`
      INSERT INTO user_employees (user_id, employee_id, assigned_by)
      VALUES (?, ?, ?)
    `);
    
    for (const empId of employee_ids) {
      insertStmt.run(userId, empId, req.user.id);
    }
  });
  
  try {
    replaceAssignments();
    res.json({
      message: `Assigned ${employee_ids.length} employees to user`,
      count: employee_ids.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update assignments' });
  }
});

// Bulk assign employees by account to a user
router.post('/assignments/user/:userId/by-account', authenticateToken, requireAdmin, (req, res) => {
  const { accounts } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(accounts)) {
    return res.status(400).json({ error: 'accounts must be an array' });
  }
  
  const placeholders = accounts.map(() => '?').join(',');
  const employees = db.prepare(`
    SELECT id FROM employees WHERE account IN (${placeholders})
  `).all(...accounts);
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO user_employees (user_id, employee_id, assigned_by)
    VALUES (?, ?, ?)
  `);
  
  let assigned = 0;
  
  const assignMany = db.transaction(() => {
    for (const emp of employees) {
      const result = insertStmt.run(userId, emp.id, req.user.id);
      assigned += result.changes;
    }
  });
  
  assignMany();
  
  res.json({
    message: `Assigned ${assigned} employees from accounts: ${accounts.join(', ')}`,
    assigned,
    total_employees: employees.length
  });
});

module.exports = router;
