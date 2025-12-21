# HonorHub - Azure Deployment Guide

This guide covers deploying HonorHub to Microsoft Azure using Azure App Service for both the backend API and frontend application.

## Prerequisites

- Azure account with an active subscription
- Azure CLI installed locally (`az` command)
- Node.js 18+ installed locally
- Git installed

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Azure Resource Group                  │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │  App Service     │      │  App Service     │         │
│  │  (Frontend)      │ ───► │  (Backend API)   │         │
│  │  React/Static    │      │  Node.js/Express │         │
│  └──────────────────┘      └──────────────────┘         │
│                                    │                     │
│                                    ▼                     │
│                            ┌──────────────────┐         │
│                            │  Azure Storage   │         │
│                            │  (File uploads)  │         │
│                            └──────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Azure CLI Login

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "Your Subscription Name"
```

---

## Step 2: Create Resource Group

```bash
# Create a resource group
az group create --name honorhub-rg --location eastus
```

---

## Step 3: Deploy Backend API

### 3.1 Create App Service Plan

```bash
# Create an App Service Plan (B1 tier for production, F1 for free tier)
az appservice plan create \
  --name honorhub-plan \
  --resource-group honorhub-rg \
  --sku B1 \
  --is-linux
```

### 3.2 Create Backend Web App

```bash
# Create the backend web app
az webapp create \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --plan honorhub-plan \
  --runtime "NODE:18-lts"
```

### 3.3 Configure Backend Environment Variables

```bash
# Set environment variables
az webapp config appsettings set \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    JWT_SECRET="your-super-secret-jwt-key-change-this" \
    FRONTEND_URL="https://honorhub-frontend.azurewebsites.net" \
    SMTP_HOST="smtp.your-email-provider.com" \
    SMTP_PORT=587 \
    SMTP_USER="your-email@domain.com" \
    SMTP_PASS="your-email-password" \
    FROM_EMAIL="noreply@yourdomain.com"
```

### 3.4 Prepare Backend for Deployment

Create a `web.config` file in the backend folder for Azure:

```bash
# Navigate to backend folder
cd backend
```

Create `backend/web.config`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="src/index.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^src/index.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="src/index.js"/>
        </rule>
      </rules>
    </rewrite>
    <iisnode node_env="production" />
  </system.webServer>
</configuration>
```

Update `backend/package.json` to include a start script:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

### 3.5 Deploy Backend

**Option A: Deploy using ZIP deployment**

```bash
# From the backend directory
cd backend

# Install dependencies
npm install --production

# Create a zip file
zip -r ../backend.zip .

# Deploy
az webapp deployment source config-zip \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --src ../backend.zip
```

**Option B: Deploy using Git**

```bash
# Configure local git deployment
az webapp deployment source config-local-git \
  --name honorhub-api \
  --resource-group honorhub-rg

# Get the deployment URL
az webapp deployment list-publishing-credentials \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --query scmUri \
  --output tsv

# Add Azure as a remote and push
git remote add azure-backend <deployment-url>
git push azure-backend main
```

### 3.6 Enable Persistent Storage for SQLite & Uploads

```bash
# Enable persistent storage
az webapp config appsettings set \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --settings WEBSITES_ENABLE_APP_SERVICE_STORAGE=true

# Mount persistent storage path
az webapp config storage-account add \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --custom-id uploads \
  --storage-type AzureFiles \
  --share-name honorhub-uploads \
  --account-name <your-storage-account> \
  --access-key <your-storage-key> \
  --mount-path /home/site/wwwroot/uploads
```

---

## Step 4: Deploy Frontend

### 4.1 Build Frontend for Production

```bash
cd frontend

# Create production environment file
echo "VITE_API_URL=https://honorhub-api.azurewebsites.net/api" > .env.production

# Install dependencies and build
npm install
npm run build
```

### 4.2 Create Frontend Web App

```bash
# Create a static web app for frontend
az webapp create \
  --name honorhub-frontend \
  --resource-group honorhub-rg \
  --plan honorhub-plan \
  --runtime "NODE:18-lts"
```

### 4.3 Configure Frontend for SPA Routing

Create `frontend/staticwebapp.config.json`:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.js", "/*.css", "/*.ico", "/*.png", "/*.svg"]
  }
}
```

Or for App Service, create `frontend/web.config` in the dist folder:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

### 4.4 Deploy Frontend

```bash
cd frontend/dist

# Copy web.config to dist folder
cp ../web.config .

# Create zip
zip -r ../../frontend.zip .

# Deploy
az webapp deployment source config-zip \
  --name honorhub-frontend \
  --resource-group honorhub-rg \
  --src ../../frontend.zip
```

---

## Step 5: Configure CORS on Backend

Update the backend to allow requests from the frontend domain:

```bash
az webapp cors add \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --allowed-origins "https://honorhub-frontend.azurewebsites.net"
```

---

## Step 6: Set Up Azure Storage (Optional but Recommended)

For production, use Azure Blob Storage instead of local file storage:

### 6.1 Create Storage Account

```bash
# Create storage account
az storage account create \
  --name honorhubstorage \
  --resource-group honorhub-rg \
  --location eastus \
  --sku Standard_LRS

# Create containers
az storage container create \
  --name uploads \
  --account-name honorhubstorage \
  --public-access blob
```

### 6.2 Get Connection String

```bash
az storage account show-connection-string \
  --name honorhubstorage \
  --resource-group honorhub-rg \
  --query connectionString \
  --output tsv
```

Add the connection string to backend environment variables:
```bash
az webapp config appsettings set \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --settings AZURE_STORAGE_CONNECTION_STRING="<connection-string>"
```

---

## Step 7: Configure Custom Domain (Optional)

### 7.1 Add Custom Domain

```bash
# Add custom domain to frontend
az webapp config hostname add \
  --webapp-name honorhub-frontend \
  --resource-group honorhub-rg \
  --hostname www.yourdomain.com

# Add custom domain to backend API
az webapp config hostname add \
  --webapp-name honorhub-api \
  --resource-group honorhub-rg \
  --hostname api.yourdomain.com
```

### 7.2 Enable HTTPS with Managed Certificate

```bash
# Create managed certificate for frontend
az webapp config ssl create \
  --name honorhub-frontend \
  --resource-group honorhub-rg \
  --hostname www.yourdomain.com

# Bind the certificate
az webapp config ssl bind \
  --name honorhub-frontend \
  --resource-group honorhub-rg \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

---

## Step 8: Set Up CI/CD with GitHub Actions (Optional)

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install backend dependencies
        run: |
          cd backend
          npm ci --production
          
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'honorhub-api'
          publish-profile: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
          package: ./backend

  build-and-deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install and build frontend
        run: |
          cd frontend
          npm ci
          echo "VITE_API_URL=https://honorhub-api.azurewebsites.net/api" > .env.production
          npm run build
          
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'honorhub-frontend'
          publish-profile: ${{ secrets.AZURE_FRONTEND_PUBLISH_PROFILE }}
          package: ./frontend/dist
```

To get publish profiles:
```bash
# Get backend publish profile
az webapp deployment list-publishing-profiles \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --xml

# Get frontend publish profile
az webapp deployment list-publishing-profiles \
  --name honorhub-frontend \
  --resource-group honorhub-rg \
  --xml
```

Add these as secrets `AZURE_BACKEND_PUBLISH_PROFILE` and `AZURE_FRONTEND_PUBLISH_PROFILE` in your GitHub repository.

---

## Step 9: Monitoring and Logging

### Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app honorhub-insights \
  --location eastus \
  --resource-group honorhub-rg

# Get instrumentation key
az monitor app-insights component show \
  --app honorhub-insights \
  --resource-group honorhub-rg \
  --query instrumentationKey \
  --output tsv

# Add to backend
az webapp config appsettings set \
  --name honorhub-api \
  --resource-group honorhub-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<instrumentation-key>"
```

### View Logs

```bash
# Stream backend logs
az webapp log tail \
  --name honorhub-api \
  --resource-group honorhub-rg
```

---

## Environment Variables Summary

### Backend (honorhub-api)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `8080` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secure-secret` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://honorhub-frontend.azurewebsites.net` |
| `SMTP_HOST` | Email server host | `smtp.office365.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | `noreply@company.com` |
| `SMTP_PASS` | Email password | `password` |
| `FROM_EMAIL` | Sender email address | `noreply@company.com` |

### Frontend (honorhub-frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://honorhub-api.azurewebsites.net/api` |

---

## Troubleshooting

### Common Issues

1. **SQLite database not persisting**
   - Enable persistent storage on App Service
   - Consider using Azure SQL Database for production

2. **File uploads not working**
   - Check storage mount configuration
   - Verify write permissions on upload directory

3. **CORS errors**
   - Ensure frontend URL is added to CORS allowed origins
   - Check that the URL matches exactly (including protocol)

4. **502 Bad Gateway errors**
   - Check application logs: `az webapp log tail --name honorhub-api --resource-group honorhub-rg`
   - Verify Node.js version compatibility
   - Check that the start script is correct in package.json

5. **Frontend routing not working**
   - Ensure web.config is included in the deployment
   - Verify SPA fallback rules are configured

---

## Cost Estimation

| Resource | SKU | Estimated Monthly Cost |
|----------|-----|----------------------|
| App Service Plan (B1) | Basic | ~$13 |
| App Service (2 apps) | Included in plan | $0 |
| Storage Account | Standard LRS | ~$1-5 |
| **Total** | | **~$15-20/month** |

For free tier (development):
- Use F1 (Free) App Service Plan (limited to 60 CPU minutes/day)
- Note: Free tier doesn't support custom domains or SSL

---

## Security Checklist

- [ ] Change default JWT_SECRET to a strong, unique value
- [ ] Enable HTTPS only on both apps
- [ ] Configure proper CORS origins
- [ ] Set up Azure Key Vault for secrets (optional)
- [ ] Enable Azure DDoS Protection (optional)
- [ ] Configure backup for database and uploads
- [ ] Set up alerts for errors and performance issues

