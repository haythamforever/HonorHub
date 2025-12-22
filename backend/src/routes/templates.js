const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, run } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const templates = await getAll('SELECT * FROM templates ORDER BY is_default DESC, name ASC');
    
    // Parse design_config JSON
    const parsedTemplates = templates.map(t => ({
      ...t,
      design_config: JSON.parse(t.design_config)
    }));
    
    res.json(parsedTemplates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await getOne('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json({
      ...template,
      design_config: JSON.parse(template.design_config)
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().trim(),
  body('design_config').isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, design_config, is_default } = req.body;
  
  try {
    // If setting as default, remove default from others
    if (is_default) {
      await run('UPDATE templates SET is_default = 0');
    }
    
    const result = await run(`
      INSERT INTO templates (name, description, design_config, is_default) 
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [name, description || null, JSON.stringify(design_config), is_default ? 1 : 0]);
    
    res.status(201).json({
      id: result.rows[0].id,
      name,
      description,
      design_config,
      is_default: is_default ? 1 : 0
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, design_config, is_default, thumbnail_path } = req.body;
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (name) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (design_config) {
    updates.push(`design_config = $${paramIndex++}`);
    values.push(JSON.stringify(design_config));
  }
  if (thumbnail_path !== undefined) {
    updates.push(`thumbnail_path = $${paramIndex++}`);
    values.push(thumbnail_path);
  }
  
  try {
    if (is_default !== undefined) {
      if (is_default) {
        await run('UPDATE templates SET is_default = 0');
      }
      updates.push(`is_default = $${paramIndex++}`);
      values.push(is_default ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);
    
    await run(`UPDATE templates SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    
    const template = await getOne('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    
    res.json({
      ...template,
      design_config: JSON.parse(template.design_config)
    });
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const template = await getOne('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (template.is_default) {
      return res.status(400).json({ error: 'Cannot delete default template' });
    }
    
    // Check if template is being used
    const certificatesUsingTemplate = await getOne('SELECT COUNT(*) as count FROM certificates WHERE template_id = $1', [req.params.id]);
    
    if (parseInt(certificatesUsingTemplate.count) > 0) {
      return res.status(400).json({ error: 'Cannot delete template that is being used by certificates' });
    }
    
    await run('DELETE FROM templates WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
