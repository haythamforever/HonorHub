const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const { generateCertificatePDF } = require('../services/pdfGenerator');
const { sendCertificateEmail } = require('../services/emailService');

const router = express.Router();

// Get all certificates
router.get('/', authenticateToken, (req, res) => {
  const { employee_id, tier_id, sent_by } = req.query;
  
  let query = `
    SELECT 
      c.*,
      e.name as employee_name,
      e.email as employee_email,
      e.department as employee_department,
      t.name as tier_name,
      t.color as tier_color,
      temp.name as template_name,
      u.name as sender_name
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    JOIN tiers t ON c.tier_id = t.id
    JOIN templates temp ON c.template_id = temp.id
    JOIN users u ON c.sent_by = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (employee_id) {
    query += ' AND c.employee_id = ?';
    params.push(employee_id);
  }
  if (tier_id) {
    query += ' AND c.tier_id = ?';
    params.push(tier_id);
  }
  if (sent_by) {
    query += ' AND c.sent_by = ?';
    params.push(sent_by);
  }
  
  query += ' ORDER BY c.created_at DESC';
  
  const certificates = db.prepare(query).all(...params);
  res.json(certificates);
});

// Get certificate by ID
router.get('/:id', authenticateToken, (req, res) => {
  const certificate = db.prepare(`
    SELECT 
      c.*,
      e.name as employee_name,
      e.email as employee_email,
      e.department as employee_department,
      e.position as employee_position,
      t.name as tier_name,
      t.color as tier_color,
      t.description as tier_description,
      temp.name as template_name,
      temp.design_config,
      u.name as sender_name,
      u.signature_path as sender_signature,
      u.logo_path as sender_logo
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    JOIN tiers t ON c.tier_id = t.id
    JOIN templates temp ON c.template_id = temp.id
    JOIN users u ON c.sent_by = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  
  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found' });
  }
  
  certificate.design_config = JSON.parse(certificate.design_config);
  res.json(certificate);
});

// Create certificate
router.post('/', authenticateToken, [
  body('employee_id').isInt(),
  body('tier_id').isInt(),
  body('template_id').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { employee_id, tier_id, template_id, custom_message, achievement_description, period, send_email } = req.body;
  
  // Verify all references exist
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
  if (!employee) {
    return res.status(400).json({ error: 'Employee not found' });
  }
  
  const tier = db.prepare('SELECT * FROM tiers WHERE id = ?').get(tier_id);
  if (!tier) {
    return res.status(400).json({ error: 'Tier not found' });
  }
  
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  if (!template) {
    return res.status(400).json({ error: 'Template not found' });
  }

  const certificateId = uuidv4();
  
  // Get company logo from settings
  const companyLogoSetting = db.prepare("SELECT value FROM settings WHERE key = 'company_logo'").get();
  const companyLogoPath = companyLogoSetting?.value || null;
  
  // Get signature info
  const signatureName = req.user.signature_name || db.prepare("SELECT value FROM settings WHERE key = 'global_signature_name'").get()?.value;
  const signatureTitle = req.user.signature_title || db.prepare("SELECT value FROM settings WHERE key = 'global_signature_title'").get()?.value;
  
  try {
    // Generate PDF
    const pdfPath = await generateCertificatePDF({
      certificateId,
      employee,
      tier,
      template: { ...template, design_config: JSON.parse(template.design_config) },
      sender: req.user,
      customMessage: custom_message,
      achievementDescription: achievement_description,
      period: period,
      companyLogoPath,
      signatureName,
      signatureTitle
    });
    
    const result = db.prepare(`
      INSERT INTO certificates (certificate_id, employee_id, tier_id, template_id, sent_by, custom_message, achievement_description, period, pdf_path) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(certificateId, employee_id, tier_id, template_id, req.user.id, custom_message || null, achievement_description || null, period || null, pdfPath);
    
    // Send email if requested
    if (send_email) {
      try {
        await sendCertificateEmail({
          employee,
          tier,
          sender: req.user,
          customMessage: custom_message,
          pdfPath
        });
        
        db.prepare('UPDATE certificates SET email_sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(result.lastInsertRowid);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the whole request if email fails
      }
    }
    
    const certificate = db.prepare(`
      SELECT 
        c.*,
        e.name as employee_name,
        t.name as tier_name
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      JOIN tiers t ON c.tier_id = t.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(certificate);
  } catch (error) {
    console.error('Certificate creation failed:', error);
    res.status(500).json({ error: 'Failed to create certificate' });
  }
});

// Bulk create certificates
router.post('/bulk', authenticateToken, async (req, res) => {
  const { certificates: certData, send_email } = req.body;
  
  if (!Array.isArray(certData) || certData.length === 0) {
    return res.status(400).json({ error: 'Invalid certificates data' });
  }

  // Get company logo from settings
  const companyLogoSetting = db.prepare("SELECT value FROM settings WHERE key = 'company_logo'").get();
  const companyLogoPath = companyLogoSetting?.value || null;
  
  // Get signature info
  const signatureName = req.user.signature_name || db.prepare("SELECT value FROM settings WHERE key = 'global_signature_name'").get()?.value;
  const signatureTitle = req.user.signature_title || db.prepare("SELECT value FROM settings WHERE key = 'global_signature_title'").get()?.value;

  const results = { success: 0, failed: 0, errors: [], certificates: [] };

  for (const cert of certData) {
    try {
      const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(cert.employee_id);
      const tier = db.prepare('SELECT * FROM tiers WHERE id = ?').get(cert.tier_id);
      const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(cert.template_id);
      
      if (!employee || !tier || !template) {
        results.failed++;
        results.errors.push({ cert, error: 'Invalid employee, tier, or template reference' });
        continue;
      }

      const certificateId = uuidv4();
      
      const pdfPath = await generateCertificatePDF({
        certificateId,
        employee,
        tier,
        template: { ...template, design_config: JSON.parse(template.design_config) },
        sender: req.user,
        customMessage: cert.custom_message,
        achievementDescription: cert.achievement_description,
        period: cert.period,
        companyLogoPath,
        signatureName,
        signatureTitle
      });
      
      const result = db.prepare(`
        INSERT INTO certificates (certificate_id, employee_id, tier_id, template_id, sent_by, custom_message, achievement_description, period, pdf_path) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(certificateId, cert.employee_id, cert.tier_id, cert.template_id, req.user.id, cert.custom_message || null, cert.achievement_description || null, cert.period || null, pdfPath);
      
      if (send_email) {
        try {
          await sendCertificateEmail({
            employee,
            tier,
            sender: req.user,
            customMessage: cert.custom_message,
            pdfPath
          });
          
          db.prepare('UPDATE certificates SET email_sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(result.lastInsertRowid);
        } catch (emailError) {
          console.error('Email sending failed for', employee.email, ':', emailError);
        }
      }
      
      results.success++;
      results.certificates.push({ id: result.lastInsertRowid, employee_name: employee.name });
    } catch (error) {
      results.failed++;
      results.errors.push({ cert, error: error.message });
    }
  }
  
  res.json({
    message: `Created ${results.success} certificates`,
    ...results
  });
});

// Resend certificate email
router.post('/:id/resend', authenticateToken, async (req, res) => {
  const certificate = db.prepare(`
    SELECT 
      c.*,
      e.name as employee_name,
      e.email as employee_email,
      t.name as tier_name
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    JOIN tiers t ON c.tier_id = t.id
    WHERE c.id = ?
  `).get(req.params.id);
  
  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found' });
  }
  
  try {
    await sendCertificateEmail({
      employee: { name: certificate.employee_name, email: certificate.employee_email },
      tier: { name: certificate.tier_name },
      sender: req.user,
      customMessage: certificate.custom_message,
      pdfPath: certificate.pdf_path
    });
    
    db.prepare('UPDATE certificates SET email_sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(req.params.id);
    
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email resend failed:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Delete certificate
router.delete('/:id', authenticateToken, (req, res) => {
  const certificate = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
  
  if (!certificate) {
    return res.status(404).json({ error: 'Certificate not found' });
  }
  
  // Only admin or the sender can delete
  if (req.user.role !== 'admin' && certificate.sent_by !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this certificate' });
  }
  
  db.prepare('DELETE FROM certificates WHERE id = ?').run(req.params.id);
  
  res.json({ message: 'Certificate deleted successfully' });
});

// Get certificate statistics
router.get('/stats/overview', authenticateToken, (req, res) => {
  const totalCertificates = db.prepare('SELECT COUNT(*) as count FROM certificates').get().count;
  const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  const certificatesByTier = db.prepare(`
    SELECT t.name, t.color, COUNT(c.id) as count 
    FROM tiers t 
    LEFT JOIN certificates c ON t.id = c.tier_id 
    GROUP BY t.id
    ORDER BY t.rank
  `).all();
  const recentCertificates = db.prepare(`
    SELECT 
      c.*,
      e.name as employee_name,
      t.name as tier_name,
      t.color as tier_color
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    JOIN tiers t ON c.tier_id = t.id
    ORDER BY c.created_at DESC
    LIMIT 5
  `).all();
  
  res.json({
    totalCertificates,
    totalEmployees,
    certificatesByTier,
    recentCertificates
  });
});

module.exports = router;

