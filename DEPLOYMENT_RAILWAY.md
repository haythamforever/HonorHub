# HonorHub - Railway Deployment Guide

This guide walks you through deploying HonorHub on [Railway](https://railway.app), a modern cloud platform with seamless GitHub integration, automatic deployments, and built-in PostgreSQL support.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure for Deployment](#project-structure-for-deployment)
3. [Step 1: Prepare the Repository](#step-1-prepare-the-repository)
4. [Step 2: Create Railway Account and Project](#step-2-create-railway-account-and-project)
5. [Step 3: Deploy PostgreSQL Database](#step-3-deploy-postgresql-database)
6. [Step 4: Deploy Backend](#step-4-deploy-backend)
7. [Step 5: Deploy Frontend](#step-5-deploy-frontend)
8. [Step 6: Configure Environment Variables](#step-6-configure-environment-variables)
9. [Step 7: Configure Custom Domains (Optional)](#step-7-configure-custom-domains-optional)
10. [Step 8: Post-Deployment Setup](#step-8-post-deployment-setup)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

Before you begin, ensure you have:

- [ ] A [Railway account](https://railway.app) (free tier available with $5 credit/month)
- [ ] A [GitHub account](https://github.com)
- [ ] Your HonorHub code pushed to a GitHub repository
- [ ] Node.js 18+ installed locally (for testing)
- [ ] Git installed on your machine

---

## Project Structure for Deployment

Your project should have this structure:

```
HonorHub/
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── index.js
│   │   ├── database/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── services/
│   └── uploads/          # Will use Railway volumes or cloud storage
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── package.json          # Root package.json for monorepo
└── railway.json          # Railway configuration (we'll create this)
```

---

## Step 1: Prepare the Repository

### 1.1 Create Root package.json (if not exists)

Create a root `package.json` for the monorepo:

```json
{
  "name": "honorhub",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "install:all": "npm install && cd backend && npm install && cd ../frontend && npm install",
    "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\"",
    "build:frontend": "cd frontend && npm run build",
    "start:backend": "cd backend && npm start"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### 1.2 Create railway.json Configuration

Create `railway.json` in the project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 1.3 Update Backend for Production

Update `backend/package.json` to include the start script:

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 1.4 Update Frontend for Production

Create `frontend/vite.config.js` (if not configured for production):

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 5173
  }
})
```

### 1.5 Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Railway deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/honorhub.git

# Push
git push -u origin main
```

---

## Step 2: Create Railway Account and Project

### 2.1 Sign Up / Log In

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with GitHub for seamless integration

### 2.2 Create a New Project

1. Click **"New Project"**
2. Select **"Empty Project"**
3. Name it `honorhub`

---

## Step 3: Deploy PostgreSQL Database

### 3.1 Add PostgreSQL Service

1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Choose **"PostgreSQL"**
4. Railway will automatically provision a PostgreSQL database

### 3.2 Get Database Connection String

1. Click on the PostgreSQL service
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` value (you'll need this for the backend)

The format will be:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

---

## Step 4: Deploy Backend

### 4.1 Add Backend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Connect your GitHub account if not already connected
4. Select your `honorhub` repository
5. Railway will ask which directory to deploy - select **"Configure"**

### 4.2 Configure Backend Service

1. Click on the new service
2. Go to **"Settings"** tab
3. Set the following:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### 4.3 Configure Backend Environment Variables

Go to **"Variables"** tab and add:

```env
# Database (Reference the PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS (Will update after frontend is deployed)
CORS_ORIGIN=https://your-frontend-url.railway.app

# File Uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# SMTP Configuration (Optional - for email sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4.4 Link PostgreSQL

Railway automatically links services. The `${{Postgres.DATABASE_URL}}` syntax references the PostgreSQL service's DATABASE_URL.

### 4.5 Deploy

1. Railway will automatically deploy when you push to GitHub
2. Or click **"Deploy"** to trigger a manual deployment
3. Wait for the build to complete (usually 2-3 minutes)

### 4.6 Get Backend URL

1. Go to **"Settings"** tab
2. Under **"Domains"**, click **"Generate Domain"**
3. Copy the URL (e.g., `https://honorhub-backend-production.up.railway.app`)

---

## Step 5: Deploy Frontend

### 5.1 Add Frontend Service

1. In your Railway project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Select the same `honorhub` repository
4. Click **"Configure"**

### 5.2 Configure Frontend Service

1. Click on the new service
2. Go to **"Settings"** tab
3. Set the following:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx serve -s dist -l $PORT` |

### 5.3 Configure Frontend Environment Variables

Go to **"Variables"** tab and add:

```env
# API URL (use your backend Railway URL)
VITE_API_URL=https://your-backend-url.railway.app/api

# Node environment
NODE_ENV=production
```

### 5.4 Install Serve (Static File Server)

The frontend needs a static file server. Update `frontend/package.json`:

```json
{
  "dependencies": {
    // ... existing dependencies
  },
  "devDependencies": {
    // ... existing devDependencies
    "serve": "^14.2.1"
  }
}
```

Or Railway will use `npx serve` to install it on-the-fly.

### 5.5 Deploy and Get URL

1. Deploy the frontend
2. Go to **"Settings"** → **"Domains"** → **"Generate Domain"**
3. Copy the URL (e.g., `https://honorhub-frontend-production.up.railway.app`)

---

## Step 6: Configure Environment Variables

### 6.1 Update Backend CORS

Now that you have the frontend URL, update the backend's `CORS_ORIGIN`:

1. Go to Backend service → **"Variables"**
2. Update: `CORS_ORIGIN=https://honorhub-frontend-production.up.railway.app`

### 6.2 Verify All Variables

**Backend Variables:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-secure-jwt-secret-min-32-chars
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.railway.app
```

**Frontend Variables:**
```env
VITE_API_URL=https://your-backend-url.railway.app/api
NODE_ENV=production
```

---

## Step 7: Configure Custom Domains (Optional)

### 7.1 Add Custom Domain

1. Go to service **"Settings"** → **"Domains"**
2. Click **"+ Custom Domain"**
3. Enter your domain (e.g., `honorhub.yourdomain.com`)

### 7.2 Configure DNS

Add the following DNS records to your domain provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | honorhub | your-service.railway.app |

Or for apex domain (yourdomain.com):
| Type | Name | Value |
|------|------|-------|
| A | @ | Railway's IP (shown in dashboard) |

### 7.3 SSL Certificate

Railway automatically provisions SSL certificates for custom domains using Let's Encrypt.

---

## Step 8: Post-Deployment Setup

### 8.1 Verify Deployment

1. **Backend Health Check:**
   ```
   https://your-backend-url.railway.app/api/health
   ```
   Should return: `{"status": "ok"}`

2. **Frontend Access:**
   ```
   https://your-frontend-url.railway.app
   ```
   Should show the login page

### 8.2 Create Admin Account

1. Navigate to your frontend URL
2. Since no users exist, you'll see **"Create Admin Account"**
3. Fill in your admin details:
   - Email: `admin@yourcompany.com`
   - Password: (strong password)
   - Name: Your Name
4. This first user becomes the administrator

### 8.3 Configure Application Settings

1. Log in as admin
2. Go to **Settings** page
3. Configure:
   - Company Name
   - Company Logo
   - Email Settings (SMTP)
   - Default Signature

### 8.4 Set Up File Storage (Optional)

Railway's filesystem is ephemeral. For persistent file uploads, consider:

1. **Railway Volumes** (Recommended):
   - Add a volume to the backend service
   - Mount at `/app/uploads`

2. **Cloud Storage** (Alternative):
   - AWS S3
   - Cloudinary
   - Supabase Storage

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `ECONNREFUSED` or `Connection refused`

**Solution:**
- Verify `DATABASE_URL` is correctly referenced: `${{Postgres.DATABASE_URL}}`
- Check PostgreSQL service is running
- Restart the backend service

#### 2. CORS Error

**Error:** `Access-Control-Allow-Origin` error in browser console

**Solution:**
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Include `https://` protocol
- No trailing slash

#### 3. 404 on Frontend Routes

**Error:** Refreshing page shows 404

**Solution:**
- Ensure start command uses: `npx serve -s dist -l $PORT`
- The `-s` flag enables single-page app mode

#### 4. Build Fails

**Error:** Build timeout or failure

**Solution:**
- Check `package.json` for correct scripts
- Verify `Root Directory` is set correctly
- Check build logs in Railway dashboard

#### 5. Environment Variables Not Working

**Solution:**
- Frontend vars must start with `VITE_`
- Redeploy after changing variables
- Clear build cache in Railway settings

### Viewing Logs

1. Click on the service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. View **"Build Logs"** and **"Deploy Logs"**

### Restarting Services

1. Go to service **"Deployments"** tab
2. Click **"Redeploy"** on the latest deployment

---

## Maintenance & Updates

### Automatic Deployments

Railway automatically deploys when you push to the connected branch (usually `main`).

### Manual Deployment

```bash
# Make changes locally
git add .
git commit -m "Update feature X"
git push origin main
# Railway auto-deploys
```

### Database Backups

1. Go to PostgreSQL service
2. Click **"Backups"** tab
3. Create manual backup or enable automatic backups

### Scaling

Railway Pro plan allows:
- Horizontal scaling (multiple instances)
- Larger resource limits
- Team collaboration

### Monitoring

- Railway dashboard shows CPU, memory, and network usage
- Set up alerts in **"Settings"** → **"Notifications"**

---

## Cost Estimation

### Free Tier ($5 credit/month)
- Good for development and testing
- ~500 hours of compute time

### Hobby Plan ($5/month per service)
- Backend: ~$5/month
- Frontend: ~$5/month
- PostgreSQL: ~$5/month
- **Total: ~$15-20/month**

### Pro Plan (Usage-based)
- Pay for what you use
- Better for production workloads
- Starting at ~$20/month for small apps

---

## Quick Reference

### URLs After Deployment

| Service | URL |
|---------|-----|
| Frontend | `https://honorhub-frontend-production.up.railway.app` |
| Backend API | `https://honorhub-backend-production.up.railway.app/api` |
| Health Check | `https://honorhub-backend-production.up.railway.app/api/health` |

### Environment Variables Summary

**Backend:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<your-secret>
PORT=5000
NODE_ENV=production
CORS_ORIGIN=<frontend-url>
```

**Frontend:**
```env
VITE_API_URL=<backend-url>/api
NODE_ENV=production
```

---

## Support

- **Railway Documentation:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **HonorHub Issues:** Create an issue in the GitHub repository

---

**Happy Deploying! 🚀**
