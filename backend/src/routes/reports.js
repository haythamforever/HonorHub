const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get employee recognition report with filters
router.get('/employee-recognitions', authenticateToken, (req, res) => {
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
      GROUP_CONCAT(DISTINCT t.name) as tiers_received,
      MIN(c.created_at) as first_recognition,
      MAX(c.created_at) as last_recognition
    FROM employees e
    LEFT JOIN certificates c ON e.id = c.employee_id
    LEFT JOIN tiers t ON c.tier_id = t.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (account) {
    baseQuery += ' AND e.account = ?';
    params.push(account);
  }
  
  if (manager) {
    baseQuery += ' AND e.manager_name = ?';
    params.push(manager);
  }
  
  if (year) {
    baseQuery += ' AND strftime("%Y", c.created_at) = ?';
    params.push(year.toString());
  }
  
  if (employee_id) {
    baseQuery += ' AND e.id = ?';
    params.push(employee_id);
  }
  
  baseQuery += `
    GROUP BY e.id
    ORDER BY total_recognitions DESC, e.name ASC
  `;
  
  const employees = db.prepare(baseQuery).all(...params);
  
  res.json(employees);
});

// Get detailed employee report with yearly breakdown
router.get('/employee-recognitions/:employeeId', authenticateToken, (req, res) => {
  const { employeeId } = req.params;
  
  // Get employee info
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
  
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  // Get all certificates for this employee
  const certificates = db.prepare(`
    SELECT 
      c.*,
      t.name as tier_name,
      t.color as tier_color,
      u.name as sent_by_name
    FROM certificates c
    JOIN tiers t ON c.tier_id = t.id
    JOIN users u ON c.sent_by = u.id
    WHERE c.employee_id = ?
    ORDER BY c.created_at DESC
  `).all(employeeId);
  
  // Get yearly breakdown
  const yearlyBreakdown = db.prepare(`
    SELECT 
      strftime('%Y', c.created_at) as year,
      COUNT(*) as count,
      GROUP_CONCAT(DISTINCT t.name) as tiers
    FROM certificates c
    JOIN tiers t ON c.tier_id = t.id
    WHERE c.employee_id = ?
    GROUP BY strftime('%Y', c.created_at)
    ORDER BY year DESC
  `).all(employeeId);
  
  // Get tier breakdown
  const tierBreakdown = db.prepare(`
    SELECT 
      t.name as tier_name,
      t.color as tier_color,
      COUNT(*) as count
    FROM certificates c
    JOIN tiers t ON c.tier_id = t.id
    WHERE c.employee_id = ?
    GROUP BY t.id
    ORDER BY count DESC
  `).all(employeeId);
  
  res.json({
    employee,
    totalRecognitions: certificates.length,
    certificates,
    yearlyBreakdown,
    tierBreakdown
  });
});

// Get summary statistics
router.get('/summary', authenticateToken, (req, res) => {
  const { account, manager, year } = req.query;
  
  let whereClause = '1=1';
  const params = [];
  
  if (account) {
    whereClause += ' AND e.account = ?';
    params.push(account);
  }
  
  if (manager) {
    whereClause += ' AND e.manager_name = ?';
    params.push(manager);
  }
  
  if (year) {
    whereClause += ' AND strftime("%Y", c.created_at) = ?';
    params.push(year.toString());
  }
  
  // Total recognitions
  const totalCerts = db.prepare(`
    SELECT COUNT(*) as count 
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    WHERE ${whereClause}
  `).get(...params);
  
  // Unique employees recognized
  const uniqueEmployees = db.prepare(`
    SELECT COUNT(DISTINCT c.employee_id) as count 
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    WHERE ${whereClause}
  `).get(...params);
  
  // Recognitions by tier
  const byTier = db.prepare(`
    SELECT 
      t.name,
      t.color,
      COUNT(*) as count
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    JOIN tiers t ON c.tier_id = t.id
    WHERE ${whereClause}
    GROUP BY t.id
    ORDER BY t.rank
  `).all(...params);
  
  // Recognitions by account
  const byAccount = db.prepare(`
    SELECT 
      e.account,
      COUNT(*) as count
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    WHERE ${whereClause} AND e.account IS NOT NULL
    GROUP BY e.account
    ORDER BY count DESC
  `).all(...params);
  
  // Top recognized employees
  const topEmployees = db.prepare(`
    SELECT 
      e.id,
      e.name,
      e.account,
      e.department,
      COUNT(*) as recognition_count
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    WHERE ${whereClause}
    GROUP BY e.id
    ORDER BY recognition_count DESC
    LIMIT 10
  `).all(...params);
  
  // Monthly trend (last 12 months)
  const monthlyTrend = db.prepare(`
    SELECT 
      strftime('%Y-%m', c.created_at) as month,
      COUNT(*) as count
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    WHERE ${whereClause}
    GROUP BY strftime('%Y-%m', c.created_at)
    ORDER BY month DESC
    LIMIT 12
  `).all(...params);
  
  res.json({
    totalRecognitions: totalCerts.count,
    uniqueEmployees: uniqueEmployees.count,
    byTier,
    byAccount,
    topEmployees,
    monthlyTrend: monthlyTrend.reverse()
  });
});

// Get filter options
router.get('/filters', authenticateToken, (req, res) => {
  const accounts = db.prepare(`
    SELECT DISTINCT account FROM employees 
    WHERE account IS NOT NULL AND account != ''
    ORDER BY account
  `).all().map(r => r.account);
  
  const managers = db.prepare(`
    SELECT DISTINCT manager_name FROM employees 
    WHERE manager_name IS NOT NULL AND manager_name != ''
    ORDER BY manager_name
  `).all().map(r => r.manager_name);
  
  const years = db.prepare(`
    SELECT DISTINCT strftime('%Y', created_at) as year 
    FROM certificates 
    ORDER BY year DESC
  `).all().map(r => r.year);
  
  res.json({ accounts, managers, years });
});

module.exports = router;

