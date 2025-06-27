# Google Cloud Setup Guide for AgentMeter

This guide helps you set up Google Cloud properly for AgentMeter deployment.

## 🚨 Issues You May Encounter

### Issue 1: Empty Project ID
**Error**: `Project: ` (empty project ID in deployment)

**Solution**:
```bash
# Set the environment variable
export GOOGLE_CLOUD_PROJECT="your-actual-project-id"

# Or set it permanently in your shell profile
echo 'export GOOGLE_CLOUD_PROJECT="your-actual-project-id"' >> ~/.zshrc
source ~/.zshrc
```

### Issue 2: Permission Denied
**Error**: `does not have permission to access projects instance [project-id]`

**Solutions**:

#### Option A: Use Your Own Project
1. **Create a new Google Cloud project**:
   ```bash
   # Login to Google Cloud
   gcloud auth login
   
   # Create a new project
   gcloud projects create agentmeter-deploy-$(date +%s) --name="AgentMeter Deployment"
   
   # Set the project
   export GOOGLE_CLOUD_PROJECT="agentmeter-deploy-$(date +%s)"
   gcloud config set project $GOOGLE_CLOUD_PROJECT
   
   # Enable billing (required for Cloud Run)
   # You'll need to do this manually in the Google Cloud Console
   echo "Please enable billing for project $GOOGLE_CLOUD_PROJECT in the Google Cloud Console"
   echo "https://console.cloud.google.com/billing/projects"
   ```

#### Option B: Request Access to Existing Project
If someone else owns the project `sovrn-ai`, ask them to:
1. Go to Google Cloud Console → IAM & Admin → IAM
2. Add your email (`yuwenqingisu@gmail.com`) with these roles:
   - **Cloud Run Admin**
   - **Cloud Build Editor**
   - **Secret Manager Admin**
   - **Service Usage Admin**

#### Option C: Use Different Project
```bash
# List projects you have access to
gcloud projects list

# Choose a project you have access to
export GOOGLE_CLOUD_PROJECT="your-accessible-project-id"
gcloud config set project $GOOGLE_CLOUD_PROJECT
```

## 🛠️ Complete Setup Steps

### 1. Authentication
```bash
# Login to Google Cloud
gcloud auth login

# Set up application default credentials
gcloud auth application-default login
```

### 2. Project Setup
```bash
# Create or select project
export GOOGLE_CLOUD_PROJECT="your-project-id"
gcloud config set project $GOOGLE_CLOUD_PROJECT

# Verify you have access
gcloud projects describe $GOOGLE_CLOUD_PROJECT
```

### 3. Enable Billing
- Go to [Google Cloud Console → Billing](https://console.cloud.google.com/billing)
- Link your project to a billing account
- Cloud Run requires billing to be enabled

### 4. Test Deployment Setup
```bash
# Run the local test first
npm run deploy:test

# If that passes, try a real deployment
npm run deploy:staging
```

## 🧪 Testing Without Deployment

If you want to test the deployment system without actually deploying to Google Cloud, use:

```bash
# Test all deployment components locally
npm run deploy:test
```

This will:
- ✅ Test service and frontend builds
- ✅ Validate Docker configurations  
- ✅ Check Cloud Build configs
- ✅ Verify deployment scripts
- ✅ Confirm file structure

## 🔧 Alternative: Local Development

If you prefer to develop locally without Google Cloud deployment:

```bash
# Start the service locally
npm run service:dev

# In another terminal, start the frontend
npm start

# Run tests
npm run test:integration:with-server
```

## 📚 Useful Commands

```bash
# Check current project
gcloud config get-value project

# List all projects
gcloud projects list

# Check authentication
gcloud auth list

# Check if APIs are enabled
gcloud services list --enabled

# Check billing account
gcloud billing accounts list
```

## 🆘 Still Having Issues?

1. **Run the local test first**: `npm run deploy:test`
2. **Check the deployment guide**: `deployment/docs/DEPLOYMENT_GUIDE.md`
3. **Verify your Google Cloud setup** with the commands above
4. **Create a new project** if permissions are an issue

## 💡 Quick Fix for Current Error

Based on your current error, here's the immediate fix:

```bash
# Option 1: Create a new project
PROJECT_NAME="agentmeter-$(whoami)-$(date +%s)"
gcloud projects create $PROJECT_NAME --name="AgentMeter Deployment"
export GOOGLE_CLOUD_PROJECT=$PROJECT_NAME
gcloud config set project $PROJECT_NAME

# Option 2: Use an existing project you own
gcloud projects list
export GOOGLE_CLOUD_PROJECT="your-existing-project-id"
gcloud config set project $GOOGLE_CLOUD_PROJECT

# Then enable billing and try deployment
npm run deploy:staging
```

Remember: **Enable billing** in the Google Cloud Console before deploying to Cloud Run! 