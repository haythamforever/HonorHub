const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all tiers
router.get('/', authenticateToken, (req, res) => {
  const tiers = db.prepare('SELECT * FROM tiers ORDER BY rank ASC').all();
  res.json(tiers);
});

// Get tier by ID
router.get('/:id', authenticateToken, (req, res) => {
  const tier = db.prepare('SELECT * FROM tiers WHERE id = ?').get(req.params.id);
  
  if (!tier) {
    return res.status(404).json({ error: 'Tier not found' });
  }
  
  res.json(tier);
});

// Create tier (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, color, icon, rank } = req.body;
  
  const existingTier = db.prepare('SELECT id FROM tiers WHERE name = ?').get(name);
  if (existingTier) {
    return res.status(400).json({ error: 'Tier with this name already exists' });
  }

  // Get max rank if not provided
  let tierRank = rank;
  if (!tierRank) {
    const maxRank = db.prepare('SELECT MAX(rank) as max FROM tiers').get();
    tierRank = (maxRank.max || 0) + 1;
  }

  try {
    const result = db.prepare(`
      INSERT INTO tiers (name, description, color, icon, rank) 
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description || null, color || '#4F46E5', icon || 'star', tierRank);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      description,
      color: color || '#4F46E5',
      icon: icon || 'star',
      rank: tierRank
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// Update tier (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, description, color, icon, rank } = req.body;
  
  const updates = [];
  const values = [];
  
  if (name) {
    // Check if name is unique
    const existingTier = db.prepare('SELECT id FROM tiers WHERE name = ? AND id != ?').get(name, req.params.id);
    if (existingTier) {
      return res.status(400).json({ error: 'Tier with this name already exists' });
    }
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (color) {
    updates.push('color = ?');
    values.push(color);
  }
  if (icon) {
    updates.push('icon = ?');
    values.push(icon);
  }
  if (rank !== undefined) {
    updates.push('rank = ?');
    values.push(rank);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(req.params.id);
  
  db.prepare(`UPDATE tiers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const tier = db.prepare('SELECT * FROM tiers WHERE id = ?').get(req.params.id);
  
  res.json(tier);
});

// Reorder tiers (admin only)
router.put('/reorder/all', authenticateToken, requireAdmin, (req, res) => {
  const { tiers } = req.body;
  
  if (!Array.isArray(tiers)) {
    return res.status(400).json({ error: 'Invalid tiers data' });
  }

  const updateStmt = db.prepare('UPDATE tiers SET rank = ? WHERE id = ?');
  
  const reorder = db.transaction((tierList) => {
    tierList.forEach((tier, index) => {
      updateStmt.run(index + 1, tier.id);
    });
  });

  reorder(tiers);
  
  const updatedTiers = db.prepare('SELECT * FROM tiers ORDER BY rank ASC').all();
  res.json(updatedTiers);
});

// Delete tier (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  // Check if tier is being used
  const certificatesUsingTier = db.prepare('SELECT COUNT(*) as count FROM certificates WHERE tier_id = ?').get(req.params.id);
  
  if (certificatesUsingTier.count > 0) {
    return res.status(400).json({ error: 'Cannot delete tier that is being used by certificates' });
  }
  
  const result = db.prepare('DELETE FROM tiers WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Tier not found' });
  }
  
  res.json({ message: 'Tier deleted successfully' });
});

module.exports = router;

