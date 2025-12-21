const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, (req, res) => {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  
  // Convert to object, masking sensitive values for non-admins
  const settingsObj = {};
  settings.forEach(s => {
    if (s.key === 'smtp_pass' && req.user.role !== 'admin') {
      settingsObj[s.key] = s.value ? '********' : '';
    } else {
      settingsObj[s.key] = s.value;
    }
  });
  
  res.json(settingsObj);
});

// Get single setting
router.get('/:key', authenticateToken, (req, res) => {
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  
  if (!setting) {
    return res.status(404).json({ error: 'Setting not found' });
  }
  
  // Mask password for non-admins
  if (req.params.key === 'smtp_pass' && req.user.role !== 'admin') {
    return res.json({ key: req.params.key, value: setting.value ? '********' : '' });
  }
  
  res.json({ key: req.params.key, value: setting.value });
});

// Update settings (admin only)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  const { settings } = req.body;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings data' });
  }

  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const updateMany = db.transaction((settingsObj) => {
    for (const [key, value] of Object.entries(settingsObj)) {
      // Skip password update if it's masked
      if (key === 'smtp_pass' && value === '********') {
        continue;
      }
      updateStmt.run(key, value);
    }
  });

  updateMany(settings);
  
  // Return updated settings
  const allSettings = db.prepare('SELECT key, value FROM settings').all();
  const settingsObj = {};
  allSettings.forEach(s => {
    if (s.key === 'smtp_pass') {
      settingsObj[s.key] = s.value ? '********' : '';
    } else {
      settingsObj[s.key] = s.value;
    }
  });
  
  res.json(settingsObj);
});

// Update single setting (admin only)
router.put('/:key', authenticateToken, requireAdmin, (req, res) => {
  const { value } = req.body;
  
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(req.params.key, value);
  
  res.json({ key: req.params.key, value });
});

// Test email configuration
router.post('/test-email', authenticateToken, requireAdmin, async (req, res) => {
  const { testEmail } = req.body;
  
  if (!testEmail) {
    return res.status(400).json({ error: 'Test email address required' });
  }
  
  const { sendTestEmail } = require('../services/emailService');
  
  try {
    await sendTestEmail(testEmail);
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
});

module.exports = router;

