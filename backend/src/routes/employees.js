const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, run, pool } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all employees (filtered by user assignments for non-admin users)
router.get('/', authenticateToken, async (req, res) => {
  const { search, department, account, all } = req.query;
  const isAdmin = req.user.role === 'admin';
  
  let query = '';
  const params = [];
  let paramIndex = 1;
  
  try {
    // Admins can see all employees, regular users only see their assigned employees
    if (isAdmin) {
      query = 'SELECT * FROM employees WHERE 1=1';
    } else {
      // Non-admin: only see assigned employees
      query = `
        SELECT e.* FROM employees e
        INNER JOIN user_employees ue ON e.id = ue.employee_id
        WHERE ue.user_id = $${paramIndex++}
      `;
      params.push(req.user.id);
    }
    
    if (search) {
      if (isAdmin) {
        query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR employee_id ILIKE $${paramIndex})`;
      } else {
        query += ` AND (e.name ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex} OR e.employee_id ILIKE $${paramIndex})`;
      }
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (department) {
      if (isAdmin) {
        query += ` AND department = $${paramIndex++}`;
      } else {
        query += ` AND e.department = $${paramIndex++}`;
      }
      params.push(department);
    }
    
    if (account) {
      if (isAdmin) {
        query += ` AND account = $${paramIndex++}`;
      } else {
        query += ` AND e.account = $${paramIndex++}`;
      }
      params.push(account);
    }
    
    query += isAdmin ? ' ORDER BY name ASC' : ' ORDER BY e.name ASC';
    
    const employees = await getAll(query, params);
    res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get unique accounts
router.get('/meta/accounts', authenticateToken, async (req, res) => {
  try {
    const accounts = await getAll('SELECT DISTINCT account FROM employees WHERE account IS NOT NULL ORDER BY account');
    res.json(accounts.map(a => a.account));
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Get unique departments
router.get('/meta/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await getAll('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department');
    res.json(departments.map(d => d.department));
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get employee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const employee = await getOne('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Check access for non-admin users
    if (req.user.role !== 'admin') {
      const hasAccess = await getOne(
        'SELECT 1 FROM user_employees WHERE user_id = $1 AND employee_id = $2',
        [req.user.id, req.params.id]
      );
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this employee' });
      }
    }
    
    res.json(employee);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Create employee (admin only)
router.post('/', authenticateToken, requireAdmin, [
  body('email').isEmail().normalizeEmail(),
  body('name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { employee_id, email, name, department, position, manager_name, account, employee_type } = req.body;
  
  try {
    const result = await run(`
      INSERT INTO employees (employee_id, email, name, department, position, manager_name, account, employee_type) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `, [
      employee_id || null, 
      email, 
      name, 
      department || null, 
      position || null, 
      manager_name || null,
      account || null,
      employee_type || null
    ]);
    
    res.status(201).json({
      id: result.rows[0].id,
      employee_id,
      email,
      name,
      department,
      position,
      manager_name,
      account,
      employee_type
    });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Bulk create/update employees from CSV (admin only)
router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
  const { employees } = req.body;
  
  if (!Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({ error: 'Invalid employees data' });
  }

  const results = { success: 0, failed: 0, errors: [] };
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    for (const emp of employees) {
      try {
        // Map CSV columns to database fields
        const name = emp.Displayname || emp.displayname || emp.name;
        const email = emp.mail || emp.email;
        const manager = emp.Manager || emp.manager || emp.manager_name;
        const account = emp.Account || emp.account;
        const position = emp.Description || emp.description || emp.position;
        const employeeType = emp.employeeType || emp.employee_type;
        const department = emp.Department || emp.department;
        
        if (!email || !name) {
          results.failed++;
          results.errors.push({ employee: emp, error: 'Missing required fields (name/Displayname, mail/email)' });
          continue;
        }
        
        // Use email as employee_id if not provided
        const employeeId = emp.employee_id || email;
        
        await client.query(`
          INSERT INTO employees (employee_id, email, name, department, position, manager_name, account, employee_type) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT(employee_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            position = EXCLUDED.position,
            manager_name = EXCLUDED.manager_name,
            account = EXCLUDED.account,
            employee_type = EXCLUDED.employee_type,
            updated_at = CURRENT_TIMESTAMP
        `, [employeeId, email, name, department || null, position || null, manager || null, account || null, employeeType || null]);
        
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ employee: emp, error: error.message });
      }
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk import error:', error);
    return res.status(500).json({ error: 'Failed to import employees' });
  } finally {
    client.release();
  }
  
  res.json({
    message: `Imported ${results.success} employees`,
    ...results
  });
});

// Update employee (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { employee_id, email, name, department, position, manager_name, account, employee_type } = req.body;
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (employee_id !== undefined) {
    updates.push(`employee_id = $${paramIndex++}`);
    values.push(employee_id);
  }
  if (email) {
    updates.push(`email = $${paramIndex++}`);
    values.push(email);
  }
  if (name) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (department !== undefined) {
    updates.push(`department = $${paramIndex++}`);
    values.push(department);
  }
  if (position !== undefined) {
    updates.push(`position = $${paramIndex++}`);
    values.push(position);
  }
  if (manager_name !== undefined) {
    updates.push(`manager_name = $${paramIndex++}`);
    values.push(manager_name);
  }
  if (account !== undefined) {
    updates.push(`account = $${paramIndex++}`);
    values.push(account);
  }
  if (employee_type !== undefined) {
    updates.push(`employee_type = $${paramIndex++}`);
    values.push(employee_type);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);
  
  try {
    await run(`UPDATE employees SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values);
    const employee = await getOne('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    res.json(employee);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await run('DELETE FROM employees WHERE id = $1', [req.params.id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ============================================
// User-Employee Assignment Routes (admin only)
// ============================================

// Get all employees assigned to a specific user
router.get('/assignments/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employees = await getAll(`
      SELECT e.*, ue.assigned_at 
      FROM employees e
      INNER JOIN user_employees ue ON e.id = ue.employee_id
      WHERE ue.user_id = $1
      ORDER BY e.name ASC
    `, [req.params.userId]);
    
    res.json(employees);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Assign employees to a user
router.post('/assignments/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { employee_ids } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'employee_ids must be an array' });
  }
  
  const results = { assigned: 0, errors: [] };
  
  for (const empId of employee_ids) {
    try {
      const result = await run(`
        INSERT INTO user_employees (user_id, employee_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, employee_id) DO NOTHING
      `, [userId, empId, req.user.id]);
      
      if (result.rowCount > 0) {
        results.assigned++;
      }
    } catch (error) {
      results.errors.push({ employee_id: empId, error: error.message });
    }
  }
  
  res.json({
    message: `Assigned ${results.assigned} employees to user`,
    ...results
  });
});

// Remove employee assignments from a user
router.delete('/assignments/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { employee_ids } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'employee_ids must be an array' });
  }
  
  let removed = 0;
  
  for (const empId of employee_ids) {
    const result = await run('DELETE FROM user_employees WHERE user_id = $1 AND employee_id = $2', [userId, empId]);
    removed += result.rowCount;
  }
  
  res.json({
    message: `Removed ${removed} employee assignments`,
    removed
  });
});

// Replace all employee assignments for a user
router.put('/assignments/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { employee_ids } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(employee_ids)) {
    return res.status(400).json({ error: 'employee_ids must be an array' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Remove all existing assignments
    await client.query('DELETE FROM user_employees WHERE user_id = $1', [userId]);
    
    // Add new assignments
    for (const empId of employee_ids) {
      await client.query(`
        INSERT INTO user_employees (user_id, employee_id, assigned_by)
        VALUES ($1, $2, $3)
      `, [userId, empId, req.user.id]);
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: `Assigned ${employee_ids.length} employees to user`,
      count: employee_ids.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update assignments error:', error);
    res.status(500).json({ error: 'Failed to update assignments' });
  } finally {
    client.release();
  }
});

// Bulk assign employees by account to a user
router.post('/assignments/user/:userId/by-account', authenticateToken, requireAdmin, async (req, res) => {
  const { accounts } = req.body;
  const userId = parseInt(req.params.userId);
  
  if (!Array.isArray(accounts)) {
    return res.status(400).json({ error: 'accounts must be an array' });
  }
  
  try {
    const placeholders = accounts.map((_, i) => `$${i + 1}`).join(',');
    const employees = await getAll(`SELECT id FROM employees WHERE account IN (${placeholders})`, accounts);
    
    let assigned = 0;
    
    for (const emp of employees) {
      try {
        const result = await run(`
          INSERT INTO user_employees (user_id, employee_id, assigned_by)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, employee_id) DO NOTHING
        `, [userId, emp.id, req.user.id]);
        
        assigned += result.rowCount;
      } catch (error) {
        // Ignore individual errors
      }
    }
    
    res.json({
      message: `Assigned ${assigned} employees from accounts: ${accounts.join(', ')}`,
      assigned,
      total_employees: employees.length
    });
  } catch (error) {
    console.error('Assign by account error:', error);
    res.status(500).json({ error: 'Failed to assign by account' });
  }
});

module.exports = router;
