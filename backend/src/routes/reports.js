const express = require('express');
const { getOne, getAll } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get employee recognition report with filters
router.get('/employee-recognitions', authenticateToken, async (req, res) => {
  const { account, manager, year, employee_id } = req.query;
  
  let baseQuery = `
    SELECT 
      e.id as employee_id,
      e.name as employee_name,
      e.email,
      e.department,
      e.account,
      e.manager_name,
      e.position,
      COUNT(c.id) as total_recognitions,
      STRING_AGG(DISTINCT t.name, ', ') as tiers_received,
      MIN(c.created_at) as first_recognition,
      MAX(c.created_at) as last_recognition
    FROM employees e
    LEFT JOIN certificates c ON e.id = c.employee_id
    LEFT JOIN tiers t ON c.tier_id = t.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (account) {
    baseQuery += ` AND e.account = $${paramIndex++}`;
    params.push(account);
  }
  
  if (manager) {
    baseQuery += ` AND e.manager_name = $${paramIndex++}`;
    params.push(manager);
  }
  
  if (year) {
    baseQuery += ` AND EXTRACT(YEAR FROM c.created_at) = $${paramIndex++}`;
    params.push(parseInt(year));
  }
  
  if (employee_id) {
    baseQuery += ` AND e.id = $${paramIndex++}`;
    params.push(employee_id);
  }
  
  baseQuery += `
    GROUP BY e.id, e.name, e.email, e.department, e.account, e.manager_name, e.position
    ORDER BY total_recognitions DESC, e.name ASC
  `;
  
  try {
    const employees = await getAll(baseQuery, params);
    res.json(employees);
  } catch (error) {
    console.error('Get employee recognitions error:', error);
    res.status(500).json({ error: 'Failed to fetch employee recognitions' });
  }
});

// Get detailed employee report with yearly breakdown
router.get('/employee-recognitions/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  
  try {
    // Get employee info
    const employee = await getOne('SELECT * FROM employees WHERE id = $1', [employeeId]);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Get all certificates for this employee
    const certificates = await getAll(`
      SELECT 
        c.*,
        t.name as tier_name,
        t.color as tier_color,
        u.name as sent_by_name
      FROM certificates c
      JOIN tiers t ON c.tier_id = t.id
      JOIN users u ON c.sent_by = u.id
      WHERE c.employee_id = $1
      ORDER BY c.created_at DESC
    `, [employeeId]);
    
    // Get yearly breakdown
    const yearlyBreakdown = await getAll(`
      SELECT 
        EXTRACT(YEAR FROM c.created_at)::TEXT as year,
        COUNT(*) as count,
        STRING_AGG(DISTINCT t.name, ', ') as tiers
      FROM certificates c
      JOIN tiers t ON c.tier_id = t.id
      WHERE c.employee_id = $1
      GROUP BY EXTRACT(YEAR FROM c.created_at)
      ORDER BY year DESC
    `, [employeeId]);
    
    // Get tier breakdown
    const tierBreakdown = await getAll(`
      SELECT 
        t.name as tier_name,
        t.color as tier_color,
        COUNT(*) as count
      FROM certificates c
      JOIN tiers t ON c.tier_id = t.id
      WHERE c.employee_id = $1
      GROUP BY t.id, t.name, t.color
      ORDER BY count DESC
    `, [employeeId]);
    
    res.json({
      employee,
      totalRecognitions: certificates.length,
      certificates,
      yearlyBreakdown,
      tierBreakdown
    });
  } catch (error) {
    console.error('Get employee detail error:', error);
    res.status(500).json({ error: 'Failed to fetch employee details' });
  }
});

// Get summary statistics
router.get('/summary', authenticateToken, async (req, res) => {
  const { account, manager, year } = req.query;
  
  let whereClause = '1=1';
  const params = [];
  let paramIndex = 1;
  
  if (account) {
    whereClause += ` AND e.account = $${paramIndex++}`;
    params.push(account);
  }
  
  if (manager) {
    whereClause += ` AND e.manager_name = $${paramIndex++}`;
    params.push(manager);
  }
  
  if (year) {
    whereClause += ` AND EXTRACT(YEAR FROM c.created_at) = $${paramIndex++}`;
    params.push(parseInt(year));
  }
  
  try {
    // Total recognitions
    const totalCerts = await getOne(`
      SELECT COUNT(*) as count 
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      WHERE ${whereClause}
    `, params);
    
    // Unique employees recognized
    const uniqueEmployees = await getOne(`
      SELECT COUNT(DISTINCT c.employee_id) as count 
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      WHERE ${whereClause}
    `, params);
    
    // Recognitions by tier
    const byTier = await getAll(`
      SELECT 
        t.name,
        t.color,
        COUNT(*) as count
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      JOIN tiers t ON c.tier_id = t.id
      WHERE ${whereClause}
      GROUP BY t.id, t.name, t.color, t.rank
      ORDER BY t.rank
    `, params);
    
    // Recognitions by account
    const byAccount = await getAll(`
      SELECT 
        e.account,
        COUNT(*) as count
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      WHERE ${whereClause} AND e.account IS NOT NULL
      GROUP BY e.account
      ORDER BY count DESC
    `, params);
    
    // Top recognized employees
    const topEmployees = await getAll(`
      SELECT 
        e.id,
        e.name,
        e.account,
        e.department,
        COUNT(*) as recognition_count
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      WHERE ${whereClause}
      GROUP BY e.id, e.name, e.account, e.department
      ORDER BY recognition_count DESC
      LIMIT 10
    `, params);
    
    // Monthly trend (last 12 months)
    const monthlyTrend = await getAll(`
      SELECT 
        TO_CHAR(c.created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      WHERE ${whereClause}
      GROUP BY TO_CHAR(c.created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `, params);
    
    res.json({
      totalRecognitions: parseInt(totalCerts.count),
      uniqueEmployees: parseInt(uniqueEmployees.count),
      byTier,
      byAccount,
      topEmployees,
      monthlyTrend: monthlyTrend.reverse()
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Get filter options
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    const accounts = await getAll(`
      SELECT DISTINCT account FROM employees 
      WHERE account IS NOT NULL AND account != ''
      ORDER BY account
    `);
    
    const managers = await getAll(`
      SELECT DISTINCT manager_name FROM employees 
      WHERE manager_name IS NOT NULL AND manager_name != ''
      ORDER BY manager_name
    `);
    
    const years = await getAll(`
      SELECT DISTINCT EXTRACT(YEAR FROM created_at)::TEXT as year 
      FROM certificates 
      ORDER BY year DESC
    `);
    
    res.json({ 
      accounts: accounts.map(r => r.account), 
      managers: managers.map(r => r.manager_name), 
      years: years.map(r => r.year) 
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

module.exports = router;
