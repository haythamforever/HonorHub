const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all templates
router.get('/', authenticateToken, (req, res) => {
  const templates = db.prepare('SELECT * FROM templates ORDER BY is_default DESC, name ASC').all();
  
  // Parse design_config JSON
  const parsedTemplates = templates.map(t => ({
    ...t,
    design_config: JSON.parse(t.design_config)
  }));
  
  res.json(parsedTemplates);
});

// Get template by ID
router.get('/:id', authenticateToken, (req, res) => {
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  res.json({
    ...template,
    design_config: JSON.parse(template.design_config)
  });
});

// Create template (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().trim(),
  body('design_config').isObject()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, design_config, is_default } = req.body;
  
  try {
    // If setting as default, remove default from others
    if (is_default) {
      db.prepare('UPDATE templates SET is_default = 0').run();
    }
    
    const result = db.prepare(`
      INSERT INTO templates (name, description, design_config, is_default) 
      VALUES (?, ?, ?, ?)
    `).run(name, description || null, JSON.stringify(design_config), is_default ? 1 : 0);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      description,
      design_config,
      is_default: is_default ? 1 : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, description, design_config, is_default, thumbnail_path } = req.body;
  
  const updates = [];
  const values = [];
  
  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (design_config) {
    updates.push('design_config = ?');
    values.push(JSON.stringify(design_config));
  }
  if (thumbnail_path !== undefined) {
    updates.push('thumbnail_path = ?');
    values.push(thumbnail_path);
  }
  if (is_default !== undefined) {
    if (is_default) {
      db.prepare('UPDATE templates SET is_default = 0').run();
    }
    updates.push('is_default = ?');
    values.push(is_default ? 1 : 0);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);
  
  db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  
  res.json({
    ...template,
    design_config: JSON.parse(template.design_config)
  });
});

// Delete template (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  
  if (template.is_default) {
    return res.status(400).json({ error: 'Cannot delete default template' });
  }
  
  // Check if template is being used
  const certificatesUsingTemplate = db.prepare('SELECT COUNT(*) as count FROM certificates WHERE template_id = ?').get(req.params.id);
  
  if (certificatesUsingTemplate.count > 0) {
    return res.status(400).json({ error: 'Cannot delete template that is being used by certificates' });
  }
  
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  
  res.json({ message: 'Template deleted successfully' });
});

module.exports = router;

