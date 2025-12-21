const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, email, name, role, department, logo_path, signature_path, signature_name, signature_title, created_at 
    FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// Get user by ID
router.get('/:id', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, name, role, department, logo_path, signature_path, signature_name, signature_title, created_at 
    FROM users WHERE id = ?
  `).get(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
});

// Create user (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, role, department, signature_name, signature_title } = req.body;
  
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    const result = db.prepare(`
      INSERT INTO users (email, password, name, role, department, signature_name, signature_title) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(email, hashedPassword, name, role || 'user', department || null, signature_name || null, signature_title || null);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      email,
      name,
      role: role || 'user',
      department,
      signature_name,
      signature_title
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Users can only update their own profile unless admin
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { name, department, logo_path, signature_path, signature_name, signature_title, role, password } = req.body;
  
  const updates = [];
  const values = [];
  
  if (name) {
    updates.push('name = ?');
    values.push(name);
  }
  if (department !== undefined) {
    updates.push('department = ?');
    values.push(department);
  }
  if (logo_path !== undefined) {
    updates.push('logo_path = ?');
    values.push(logo_path);
  }
  if (signature_path !== undefined) {
    updates.push('signature_path = ?');
    values.push(signature_path);
  }
  if (signature_name !== undefined) {
    updates.push('signature_name = ?');
    values.push(signature_name);
  }
  if (signature_title !== undefined) {
    updates.push('signature_title = ?');
    values.push(signature_title);
  }
  // Only admin can change roles
  if (role !== undefined && req.user.role === 'admin') {
    updates.push('role = ?');
    values.push(role);
  }
  // Update password if provided
  if (password) {
    updates.push('password = ?');
    values.push(bcrypt.hashSync(password, 10));
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);
  
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const user = db.prepare(`
    SELECT id, email, name, role, department, logo_path, signature_path, signature_name, signature_title 
    FROM users WHERE id = ?
  `).get(userId);
  
  res.json(user);
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;

