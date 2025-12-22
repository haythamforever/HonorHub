const express = require('express');
const { getOne, getAll, run } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await getAll('SELECT key, value FROM settings');
    
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
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get single setting
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const setting = await getOne('SELECT value FROM settings WHERE key = $1', [req.params.key]);
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    // Mask password for non-admins
    if (req.params.key === 'smtp_pass' && req.user.role !== 'admin') {
      return res.json({ key: req.params.key, value: setting.value ? '********' : '' });
    }
    
    res.json({ key: req.params.key, value: setting.value });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update settings (admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  const { settings } = req.body;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings data' });
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      // Skip password update if it's masked
      if (key === 'smtp_pass' && value === '********') {
        continue;
      }
      await run(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }
    
    // Return updated settings
    const allSettings = await getAll('SELECT key, value FROM settings');
    const settingsObj = {};
    allSettings.forEach(s => {
      if (s.key === 'smtp_pass') {
        settingsObj[s.key] = s.value ? '********' : '';
      } else {
        settingsObj[s.key] = s.value;
      }
    });
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update single setting (admin only)
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
  const { value } = req.body;
  
  try {
    await run(
      `INSERT INTO settings (key, value, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [req.params.key, value]
    );
    
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
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
