const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper to run queries
const query = (text, params) => pool.query(text, params);

// Helper to get a single row
const getOne = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0];
};

// Helper to get all rows
const getAll = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};

// Helper to run insert/update and return the result
const run = async (text, params) => {
  const result = await pool.query(text, params);
  return result;
};

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Users table (admin users who can send certificates)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        logo_path TEXT,
        signature_path TEXT,
        signature_name TEXT,
        signature_title TEXT,
        department TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Employees table (recipients of certificates)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id TEXT UNIQUE,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        department TEXT,
        position TEXT,
        manager_name TEXT,
        account TEXT,
        employee_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User-Employee assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_employees (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        UNIQUE(user_id, employee_id)
      )
    `);

    // Performance tiers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tiers (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#4F46E5',
        icon TEXT DEFAULT 'star',
        rank INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Certificate templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        design_config TEXT NOT NULL,
        thumbnail_path TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Certificates table (sent certificates history)
    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        certificate_id TEXT UNIQUE NOT NULL,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        tier_id INTEGER NOT NULL REFERENCES tiers(id),
        template_id INTEGER NOT NULL REFERENCES templates(id),
        sent_by INTEGER NOT NULL REFERENCES users(id),
        custom_message TEXT,
        achievement_description TEXT,
        period TEXT,
        pdf_path TEXT,
        email_sent INTEGER DEFAULT 0,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Global settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default data
    await seedDefaultData(client);

    console.log('✅ PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedDefaultData(client) {
  // Create default tiers if not exist
  const tiersResult = await client.query('SELECT COUNT(*) as count FROM tiers');
  if (parseInt(tiersResult.rows[0].count) === 0) {
    const defaultTiers = [
      { name: 'Top Performer', description: 'Exceptional performance exceeding all expectations', color: '#F59E0B', icon: 'trophy', rank: 1 },
      { name: 'Performer Plus', description: 'Outstanding performance above expectations', color: '#8B5CF6', icon: 'star', rank: 2 },
      { name: 'Star Performer', description: 'Excellent performance meeting high standards', color: '#3B82F6', icon: 'award', rank: 3 },
      { name: 'Rising Star', description: 'Promising performance showing great potential', color: '#10B981', icon: 'trending-up', rank: 4 }
    ];
    
    for (const tier of defaultTiers) {
      await client.query(
        'INSERT INTO tiers (name, description, color, icon, rank) VALUES ($1, $2, $3, $4, $5)',
        [tier.name, tier.description, tier.color, tier.icon, tier.rank]
      );
    }
  }

  // Create default templates if not exist
  const templatesResult = await client.query('SELECT COUNT(*) as count FROM templates');
  if (parseInt(templatesResult.rows[0].count) === 0) {
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
    
    for (const template of defaultTemplates) {
      await client.query(
        'INSERT INTO templates (name, description, design_config, is_default) VALUES ($1, $2, $3, $4)',
        [template.name, template.description, template.design_config, template.is_default]
      );
    }
  }

  // Create default settings if not exist
  const settingsResult = await client.query('SELECT COUNT(*) as count FROM settings');
  if (parseInt(settingsResult.rows[0].count) === 0) {
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
      { key: 'email_body_template', value: 'Dear {employee_name},\n\nCongratulations on your outstanding achievement! You have been recognized as {tier}.\n\n{custom_message}\n\nPlease find your certificate attached.\n\nBest regards,\n{sender_name}' }
    ];
    
    for (const setting of defaultSettings) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
        [setting.key, setting.value]
      );
    }
  }
}

module.exports = { pool, query, getOne, getAll, run, initializeDatabase };
