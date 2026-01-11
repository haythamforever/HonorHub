require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const employeeRoutes = require('./routes/employees');
const tierRoutes = require('./routes/tiers');
const templateRoutes = require('./routes/templates');
const certificateRoutes = require('./routes/certificates');
const settingsRoutes = require('./routes/settings');
const uploadRoutes = require('./routes/upload');
const reportRoutes = require('./routes/reports');

const { initializeDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/logos', 'uploads/signatures', 'uploads/certificates'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tiers', tierRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'HonorHub API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

const USE_HTTPS = process.env.USE_HTTPS === 'true';

if (USE_HTTPS) {
  const certPath = process.env.CERT_PATH || path.join(__dirname, '..', 'cert.crt');
  const keyPath = process.env.KEY_PATH || path.join(__dirname, '..', 'cert.key');
  
  const sslOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
  
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`🏆 HonorHub API running on HTTPS port ${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    console.log(`🏆 HonorHub API running on HTTP port ${PORT}`);
  });
}

