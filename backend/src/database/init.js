const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', '..', 'data', 'honorhub.db');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

function initializeDatabase() {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Users table (admin users who can send certificates)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      logo_path TEXT,
      signature_path TEXT,
      signature_name TEXT,
      signature_title TEXT,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add signature_name and signature_title if they don't exist
  try {
    db.exec(`ALTER TABLE users ADD COLUMN signature_name TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN signature_title TEXT`);
  } catch (e) {}

  // Employees table (recipients of certificates)
  // Matches CSV format: Displayname, mail, Manager, Account, Description, employeeType, Department
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      position TEXT,
      manager_name TEXT,
      account TEXT,
      employee_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add new employee fields if they don't exist
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN account TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN employee_type TEXT`);
  } catch (e) {}

  // User-Employee assignments table (which employees each user can see/manage)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id),
      UNIQUE(user_id, employee_id)
    )
  `);

  // Performance tiers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#4F46E5',
      icon TEXT DEFAULT 'star',
      rank INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Certificate templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      design_config TEXT NOT NULL,
      thumbnail_path TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Certificates table (sent certificates history)
  db.exec(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_id TEXT UNIQUE NOT NULL,
      employee_id INTEGER NOT NULL,
      tier_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      sent_by INTEGER NOT NULL,
      custom_message TEXT,
      achievement_description TEXT,
      period TEXT,
      pdf_path TEXT,
      email_sent INTEGER DEFAULT 0,
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (tier_id) REFERENCES tiers(id),
      FOREIGN KEY (template_id) REFERENCES templates(id),
      FOREIGN KEY (sent_by) REFERENCES users(id)
    )
  `);

  // Migration: Add period if it doesn't exist
  try {
    db.exec(`ALTER TABLE certificates ADD COLUMN period TEXT`);
  } catch (e) {}

  // Global settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Note: No default admin user is created
  // The first user to register will automatically become an admin
  // This ensures a secure first-time setup experience

  // Create default tiers if not exist
  const tiersExist = db.prepare('SELECT COUNT(*) as count FROM tiers').get();
  if (tiersExist.count === 0) {
    const defaultTiers = [
      { name: 'Top Performer', description: 'Exceptional performance exceeding all expectations', color: '#F59E0B', icon: 'trophy', rank: 1 },
      { name: 'Performer Plus', description: 'Outstanding performance above expectations', color: '#8B5CF6', icon: 'star', rank: 2 },
      { name: 'Star Performer', description: 'Excellent performance meeting high standards', color: '#3B82F6', icon: 'award', rank: 3 },
      { name: 'Rising Star', description: 'Promising performance showing great potential', color: '#10B981', icon: 'trending-up', rank: 4 }
    ];
    
    const insertTier = db.prepare('INSERT INTO tiers (name, description, color, icon, rank) VALUES (?, ?, ?, ?, ?)');
    defaultTiers.forEach(tier => {
      insertTier.run(tier.name, tier.description, tier.color, tier.icon, tier.rank);
    });
  }

  // Create default templates if not exist
  const templatesExist = db.prepare('SELECT COUNT(*) as count FROM templates').get();
  if (templatesExist.count === 0) {
    const defaultTemplates = [
      {
        name: 'Classic Gold',
        description: 'Elegant gold-themed certificate with traditional styling',
        design_config: JSON.stringify({
          theme: 'gold',
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FEF3C7 100%)',
          borderColor: '#B45309',
          titleFont: 'Playfair Display',
          bodyFont: 'Lato',
          accentColor: '#B45309',
          layout: 'classic'
        }),
        is_default: 1
      },
      {
        name: 'Modern Blue',
        description: 'Contemporary design with clean blue aesthetics',
        design_config: JSON.stringify({
          theme: 'blue',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #EFF6FF 100%)',
          borderColor: '#1D4ED8',
          titleFont: 'Montserrat',
          bodyFont: 'Open Sans',
          accentColor: '#1D4ED8',
          layout: 'modern'
        }),
        is_default: 0
      },
      {
        name: 'Executive Purple',
        description: 'Sophisticated purple theme for executive recognition',
        design_config: JSON.stringify({
          theme: 'purple',
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #F5F3FF 100%)',
          borderColor: '#6D28D9',
          titleFont: 'Cormorant Garamond',
          bodyFont: 'Source Sans Pro',
          accentColor: '#6D28D9',
          layout: 'executive'
        }),
        is_default: 0
      },
      {
        name: 'Integrant',
        description: 'Clean design with Integrant brand colors',
        design_config: JSON.stringify({
          theme: 'integrant',
          background: '#FFFFFF',
          borderColor: '#F7941D',
          titleFont: 'Inter',
          bodyFont: 'Inter',
          accentColor: '#00B8E6',
          layout: 'minimal'
        }),
        is_default: 0
      }
    ];
    
    const insertTemplate = db.prepare('INSERT INTO templates (name, description, design_config, is_default) VALUES (?, ?, ?, ?)');
    defaultTemplates.forEach(template => {
      insertTemplate.run(template.name, template.description, template.design_config, template.is_default);
    });
  }

  // Create default settings if not exist
  const settingsExist = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (settingsExist.count === 0) {
    const defaultSettings = [
      { key: 'company_name', value: 'Integrant' },
      { key: 'company_logo', value: '' },
      { key: 'global_signature_name', value: 'Yousef Awad' },
      { key: 'global_signature_title', value: 'CEO' },
      { key: 'smtp_host', value: '' },
      { key: 'smtp_port', value: '587' },
      { key: 'smtp_secure', value: 'false' },
      { key: 'smtp_user', value: '' },
      { key: 'smtp_pass', value: '' },
      { key: 'smtp_from_name', value: 'HonorHub' },
      { key: 'smtp_from_email', value: '' },
      { key: 'email_subject_template', value: 'Congratulations! You have been recognized as {tier}' },
      { key: 'email_body_template', value: 'Dear {employee_name},\\n\\nCongratulations on your outstanding achievement! You have been recognized as {tier}.\\n\\n{custom_message}\\n\\nPlease find your certificate attached.\\n\\nBest regards,\\n{sender_name}' }
    ];
    
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    defaultSettings.forEach(setting => {
      insertSetting.run(setting.key, setting.value);
    });
  }

  // Migration: Add new settings if they don't exist
  const newSettings = [
    { key: 'company_logo', value: '' },
    { key: 'global_signature_name', value: 'Yousef Awad' },
    { key: 'global_signature_title', value: 'CEO' }
  ];
  const insertOrIgnore = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  newSettings.forEach(s => insertOrIgnore.run(s.key, s.value));

  console.log('✅ Database initialized successfully');
}

module.exports = { db, initializeDatabase };
