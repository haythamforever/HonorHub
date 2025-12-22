const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, run, pool } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all tiers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tiers = await getAll('SELECT * FROM tiers ORDER BY rank ASC');
    res.json(tiers);
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ error: 'Failed to fetch tiers' });
  }
});

// Get tier by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tier = await getOne('SELECT * FROM tiers WHERE id = $1', [req.params.id]);
    
    if (!tier) {
      return res.status(404).json({ error: 'Tier not found' });
    }
    
    res.json(tier);
  } catch (error) {
    console.error('Get tier error:', error);
    res.status(500).json({ error: 'Failed to fetch tier' });
  }
});

// Create tier (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('name').notEmpty().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, color, icon, rank } = req.body;
  
  try {
    const existingTier = await getOne('SELECT id FROM tiers WHERE name = $1', [name]);
    if (existingTier) {
      return res.status(400).json({ error: 'Tier with this name already exists' });
    }

    // Get max rank if not provided
    let tierRank = rank;
    if (!tierRank) {
      const maxRank = await getOne('SELECT MAX(rank) as max FROM tiers');
      tierRank = (parseInt(maxRank?.max) || 0) + 1;
    }

    const result = await run(`
      INSERT INTO tiers (name, description, color, icon, rank) 
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [name, description || null, color || '#4F46E5', icon || 'star', tierRank]);
    
    res.status(201).json({
      id: result.rows[0].id,
      name,
      description,
      color: color || '#4F46E5',
      icon: icon || 'star',
      rank: tierRank
    });
  } catch (error) {
    console.error('Create tier error:', error);
    res.status(500).json({ error: 'Failed to create tier' });
  }
});

// Update tier (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, color, icon, rank } = req.body;
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  try {
    if (name) {
      // Check if name is unique
      const existingTier = await getOne('SELECT id FROM tiers WHERE name = $1 AND id != $2', [name, req.params.id]);
      if (existingTier) {
        return res.status(400).json({ error: 'Tier with this name already exists' });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (color) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (icon) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(icon);
    }
    if (rank !== undefined) {
      updates.push(`rank = $${paramIndex++}`);
      values.push(rank);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(req.params.id);
    
    await run(`UPDATE tiers SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    const tier = await getOne('SELECT * FROM tiers WHERE id = $1', [req.params.id]);
    
    res.json(tier);
  } catch (error) {
    console.error('Update tier error:', error);
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

// Reorder tiers (admin only)
router.put('/reorder/all', authenticateToken, requireAdmin, async (req, res) => {
  const { tiers } = req.body;
  
  if (!Array.isArray(tiers)) {
    return res.status(400).json({ error: 'Invalid tiers data' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (let i = 0; i < tiers.length; i++) {
      await client.query('UPDATE tiers SET rank = $1 WHERE id = $2', [i + 1, tiers[i].id]);
    }
    
    await client.query('COMMIT');
    
    const updatedTiers = await getAll('SELECT * FROM tiers ORDER BY rank ASC');
    res.json(updatedTiers);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reorder tiers error:', error);
    res.status(500).json({ error: 'Failed to reorder tiers' });
  } finally {
    client.release();
  }
});

// Delete tier (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if tier is being used
    const certificatesUsingTier = await getOne('SELECT COUNT(*) as count FROM certificates WHERE tier_id = $1', [req.params.id]);
    
    if (parseInt(certificatesUsingTier.count) > 0) {
      return res.status(400).json({ error: 'Cannot delete tier that is being used by certificates' });
    }
    
    const result = await run('DELETE FROM tiers WHERE id = $1', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tier not found' });
    }
    
    res.json({ message: 'Tier deleted successfully' });
  } catch (error) {
    console.error('Delete tier error:', error);
    res.status(500).json({ error: 'Failed to delete tier' });
  }
});

module.exports = router;
