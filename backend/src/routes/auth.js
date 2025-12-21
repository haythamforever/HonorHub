const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      logo_path: user.logo_path,
      signature_path: user.signature_path,
      signature_name: user.signature_name,
      signature_title: user.signature_title
    }
  });
});

// Check if signup is allowed (only when no users exist)
router.get('/signup-allowed', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  res.json({ allowed: userCount.count === 0 });
});

// Register - Only allowed when no users exist (first user becomes admin)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check if any users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  // If users exist, registration is not allowed
  if (userCount.count > 0) {
    return res.status(403).json({ 
      error: 'Registration is disabled. Please contact your administrator.' 
    });
  }

  const { email, password, name, department } = req.body;
  
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    // First user is always admin
    const result = db.prepare(`
      INSERT INTO users (email, password, name, department, role) 
      VALUES (?, ?, ?, ?, 'admin')
    `).run(email, hashedPassword, name, department || null);
    
    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({
      token,
      user: {
        id: result.lastInsertRowid,
        email,
        name,
        role: 'admin',
        department
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Update password
router.put('/password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hashedPassword, req.user.id);
  
  res.json({ message: 'Password updated successfully' });
});

module.exports = router;

