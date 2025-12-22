const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, run } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getAll(`
      SELECT id, email, name, role, department, logo_path, signature_path, signature_name, signature_title, created_at 
      FROM users ORDER BY created_at DESC
    `);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await getOne(`
      SELECT id, email, name, role, department, logo_path, signature_path, signature_name, signature_title, created_at 
      FROM users WHERE id = $1
    `, [req.params.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, role, department, signature_name, signature_title } = req.body;
  
  try {
    const existingUser = await getOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = await run(`
      INSERT INTO users (email, password, name, role, department, signature_name, signature_title) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [email, hashedPassword, name, role || 'user', department || null, signature_name || null, signature_title || null]);
    
    res.status(201).json({
      id: result.rows[0].id,
      email,
      name,
      role: role || 'user',
      department,
      signature_name,
      signature_title
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Users can only update their own profile unless admin
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { name, department, logo_path, signature_path, signature_name, signature_title, role, password } = req.body;
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (name) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (department !== undefined) {
    updates.push(`department = $${paramIndex++}`);
    values.push(department);
  }
  if (logo_path !== undefined) {
    updates.push(`logo_path = $${paramIndex++}`);
    values.push(logo_path);
  }
  if (signature_path !== undefined) {
    updates.push(`signature_path = $${paramIndex++}`);
    values.push(signature_path);
  }
  if (signature_name !== undefined) {
    updates.push(`signature_name = $${paramIndex++}`);
    values.push(signature_name);
  }
  if (signature_title !== undefined) {
    updates.push(`signature_title = $${paramIndex++}`);
    values.push(signature_title);
  }
  // Only admin can change roles
  if (role !== undefined && req.user.role === 'admin') {
    updates.push(`role = $${paramIndex++}`);
    values.push(role);
  }
  // Update password if provided
  if (password) {
    updates.push(`password = $${paramIndex++}`);
    values.push(bcrypt.hashSync(password, 10));
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);
  
  try {
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    
    const user = await getOne(`
      SELECT id, email, name, role, department, logo_path, signature_path, signature_name, signature_title 
      FROM users WHERE id = $1
    `, [userId]);
    
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  try {
    const result = await run('DELETE FROM users WHERE id = $1', [userId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
