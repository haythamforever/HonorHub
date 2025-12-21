# 🏆 HonorHub - Appreciation Certificate Platform

A modern web application for sending appreciation certificates to top performers across your organization. Built with Node.js, Express, SQLite, and React.

![HonorHub](https://img.shields.io/badge/HonorHub-Appreciate%20Excellence-F97316?style=for-the-badge)

## ✨ Features

### Core Features
- **🔐 Authentication** - Secure JWT-based authentication system
- **👥 User Management** - Admin and regular user roles
- **📊 Performance Tiers** - Configurable tiers (Top Performer, Performer Plus, etc.)
- **📜 Certificate Templates** - Multiple beautiful templates to choose from
- **📧 Email Delivery** - Send certificates via email with PDF attachments
- **📤 Bulk Send** - Send certificates to multiple employees at once
- **📁 CSV Import** - Import employees from CSV files

### User Settings
- Upload company logo
- Upload digital signature
- Personal profile management

### Admin Settings
- Configure SMTP email settings
- Customize email templates
- Manage performance tiers
- Global application settings

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd HonorHub
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

3. **Configure environment**
```bash
# In the backend directory, create a .env file
cp backend/.env.example backend/.env

# Edit the .env file with your settings
```

4. **Start the development servers**
```bash
# From the root directory
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Admin Credentials
```
Email: admin@honorhub.com
Password: admin123
```

## 📁 Project Structure

```
HonorHub/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── database/       # SQLite database initialization
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # PDF generation & email services
│   │   └── index.js        # Server entry point
│   ├── uploads/            # Uploaded files (logos, signatures, certificates)
│   └── data/               # SQLite database file
│
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── store/          # Zustand state management
│   │   └── App.jsx         # Main app component
│   └── index.html
│
└── package.json            # Root package with workspace scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-jwt-key

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=HonorHub
SMTP_FROM_EMAIL=noreply@yourcompany.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account → Security → App Passwords
3. Use the app password as `SMTP_PASS`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/password` - Update password

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee
- `POST /api/employees/bulk` - Bulk import employees
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Performance Tiers
- `GET /api/tiers` - List all tiers
- `POST /api/tiers` - Create tier
- `PUT /api/tiers/:id` - Update tier
- `PUT /api/tiers/reorder/all` - Reorder tiers
- `DELETE /api/tiers/:id` - Delete tier

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template

### Certificates
- `GET /api/certificates` - List all certificates
- `POST /api/certificates` - Create and send certificate
- `POST /api/certificates/bulk` - Bulk send certificates
- `POST /api/certificates/:id/resend` - Resend certificate email
- `GET /api/certificates/stats/overview` - Get statistics

### Settings (Admin only)
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/test-email` - Send test email

### File Upload
- `POST /api/upload/logo` - Upload company logo
- `POST /api/upload/signature` - Upload signature
- `POST /api/upload/employees-csv` - Upload employees CSV

## 🎨 Certificate Templates

HonorHub includes 5 beautiful certificate templates:

1. **Classic Gold** - Elegant gold-themed with traditional styling
2. **Modern Blue** - Contemporary clean blue aesthetics
3. **Executive Purple** - Sophisticated purple for executive recognition
4. **Minimalist** - Clean and simple design
5. **Celebration** - Vibrant and festive design

## 📊 Default Performance Tiers

1. **🏆 Top Performer** - Exceptional performance exceeding all expectations
2. **⭐ Performer Plus** - Outstanding performance above expectations
3. **🥇 Star Performer** - Excellent performance meeting high standards
4. **📈 Rising Star** - Promising performance showing great potential

## 🛠️ Tech Stack

### Backend
- **Express.js** - Web framework
- **better-sqlite3** - SQLite database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **nodemailer** - Email sending
- **pdf-lib** - PDF generation
- **multer** - File uploads

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **React Query** - Data fetching
- **Zustand** - State management
- **React Router** - Routing
- **Recharts** - Charts
- **Lucide React** - Icons

## 📝 CSV Import Format

When importing employees via CSV, use these columns:

```csv
employee_id,name,email,department,position,manager_name
EMP001,John Doe,john@company.com,Engineering,Software Engineer,Jane Smith
EMP002,Jane Smith,jane@company.com,Engineering,Engineering Manager,Bob Wilson
```

**Required columns:** `name`, `email`
**Optional columns:** `employee_id`, `department`, `position`, `manager_name`

## 🔒 Security

- Passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- CORS configured for frontend origin
- Admin-only routes protected by middleware
- File uploads restricted to images only

## 📜 License

MIT License - feel free to use this for your organization!

---

Built with ❤️ for recognizing excellence

