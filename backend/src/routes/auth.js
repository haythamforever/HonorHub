const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getOne, run } = require('../database/init');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  
  try {
    const user = await getOne('SELECT * FROM users WHERE email = $1', [email]);
    
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Check if signup is allowed (only when no users exist)
router.get('/signup-allowed', async (req, res) => {
  try {
    const result = await getOne('SELECT COUNT(*) as count FROM users');
    res.json({ allowed: parseInt(result.count) === 0 });
  } catch (error) {
    console.error('Signup check error:', error);
    res.status(500).json({ error: 'Failed to check signup status' });
  }
});

// Register - Only allowed when no users exist (first user becomes admin)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check if any users exist
    const userCount = await getOne('SELECT COUNT(*) as count FROM users');
    
    // If users exist, registration is not allowed
    if (parseInt(userCount.count) > 0) {
      return res.status(403).json({ 
        error: 'Registration is disabled. Please contact your administrator.' 
      });
    }

    const { email, password, name, department } = req.body;
    
    const existingUser = await getOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // First user is always admin
    const result = await run(
      `INSERT INTO users (email, password, name, department, role) 
       VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
      [email, hashedPassword, name, department || null]
    );
    
    const userId = result.rows[0].id;
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
    
    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        name,
        role: 'admin',
        department
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
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
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  
  try {
    const user = await getOne('SELECT password FROM users WHERE id = $1', [req.user.id]);
    
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await run(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
