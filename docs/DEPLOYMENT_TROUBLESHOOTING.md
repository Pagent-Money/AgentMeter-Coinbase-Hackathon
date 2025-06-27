# AgentMeter Deployment Troubleshooting Guide

This guide covers common issues encountered during AgentMeter deployment and their solutions.

## Issues Fixed in This Update

### 1. Service Compilation Error (RESOLVED ✅)

**Issue**: Duplicate export error in authentication middleware
```
SyntaxError: `validateWebhookApiKey` has already been exported. Exported identifiers must be unique.
```

**Root Cause**: The `validateWebhookApiKey` function was exported twice:
- Once in the function definition with `export function`
- Once in the export statement at the end of the file

**Solution**: Fixed in `service/middleware/auth.js`:
- Removed `export` from function definition
- Added function to the consolidated export statement at the end

### 2. Google Cloud API Permission Errors (RESOLVED ✅)

**Issue**: Deployment script failing with permission errors when enabling APIs
```
ERROR: [user@gmail.com] does not have permission to access projects instance [project-id] 
(or it may not exist): Not found or permission denied for service(s): cloudlogging.googleapis.com
```

**Root Cause**: 
- User account may not have sufficient permissions to enable APIs
- Some APIs might already be enabled
- Billing might not be set up correctly

**Solution**: Created improved deployment scripts with better error handling:
- `deploy-enhanced.sh`: Handles API enablement gracefully with individual API checks
- `deploy-simple.sh`: Checks API status without attempting to enable them automatically

### 3. Port Conflict Issues (RESOLVED ✅)

**Issue**: Service failing to start due to port already in use
```
Error: listen EADDRINUSE: address already in use :::4021
```

**Solution**: Added process cleanup utilities and better port management in scripts.

## Deployment Options

### Option 1: Simple Deployment (Recommended for troubleshooting)

Use the simplified deployment script that handles permission issues gracefully:

```bash
cd deployment/scripts
./deploy-simple.sh [environment] [region] [project_id]
```

Example:
```bash
./deploy-simple.sh production us-central1 my-project-id
```

**Features**:
- Checks API status without automatically enabling them
- Provides clear instructions for manual API enablement
- Uses Google Container Registry (simpler than Artifact Registry)
- Basic health checks and monitoring

### Option 2: Enhanced Deployment

Use the full-featured deployment script (requires proper permissions):

```bash
cd deployment/scripts
./deploy-enhanced.sh [environment] [region] [project_id]
```

**Features**:
- Automatic API enablement (requires permissions)
- Artifact Registry setup
- Advanced secret management
- Blue-green deployment capabilities
- Comprehensive monitoring and logging

## Required Google Cloud APIs

The following APIs must be enabled for deployment:

1. **Cloud Run API** (`run.googleapis.com`) - Required for hosting the service
2. **Cloud Build API** (`cloudbuild.googleapis.com`) - Required for building containers
3. **Container Registry API** (`containerregistry.googleapis.com`) - Required for storing images

### Manual API Enablement

If automatic enablement fails, enable APIs manually:

```bash
# Enable required APIs
gcloud services enable run.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable cloudbuild.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable containerregistry.googleapis.com --project=YOUR_PROJECT_ID

# Optional APIs for enhanced features
gcloud services enable secretmanager.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable artifactregistry.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable logging.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable monitoring.googleapis.com --project=YOUR_PROJECT_ID
```

## Prerequisites Setup

### 1. Google Cloud Project Setup

```bash
# Create a new project (if needed)
gcloud projects create YOUR_PROJECT_ID

# Set the project
gcloud config set project YOUR_PROJECT_ID

# Enable billing (required for Cloud Run)
# This must be done in the Google Cloud Console
```

### 2. Authentication

```bash
# Login to Google Cloud
gcloud auth login

# Set up application default credentials
gcloud auth application-default login
```

### 3. Local Environment

```bash
# Install dependencies
npm install

# Test service locally
npm run service:dev

# Test service compilation
npm run build:service
```

## Environment Variables and Secrets

### Required Secrets for Production

The service requires the following environment variables:

1. **SUPABASE_URL** - Your Supabase project URL
2. **SUPABASE_ANON_KEY** - Supabase anonymous key
3. **SUPABASE_SERVICE_ROLE_KEY** - Supabase service role key

### Setting Up Secrets in Google Cloud

```bash
# Create secrets (replace with actual values)
echo "YOUR_SUPABASE_URL" | gcloud secrets create supabase-url --data-file=-
echo "YOUR_SUPABASE_ANON_KEY" | gcloud secrets create supabase-anon-key --data-file=-
echo "YOUR_SUPABASE_SERVICE_KEY" | gcloud secrets create supabase-service-key --data-file=-
```

### Local Development

For local development, create a `.env` file in the `service/` directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Common Deployment Issues

### Issue: Docker Build Fails

**Symptoms**:
```
docker build failed
```

**Solutions**:
1. Ensure Docker is running
2. Check disk space
3. Verify `static/service.js` exists after build
4. Run `npm run build:service` manually first

### Issue: Docker Push Permission Denied

**Symptoms**:
```
Docker push failed. Make sure you have permission to push to gcr.io/PROJECT_ID
```

**Solutions**:
1. Configure Docker authentication: `gcloud auth configure-docker`
2. Verify project permissions
3. Check billing is enabled

### Issue: Cloud Run Deployment Fails

**Symptoms**:
```
Cloud Run deployment failed
```

**Solutions**:
1. Check Cloud Run API is enabled
2. Verify region is supported
3. Ensure service account has necessary permissions
4. Check quotas and limits

### Issue: Service Not Responding After Deployment

**Symptoms**:
- Deployment succeeds but health check fails
- Service returns 5xx errors

**Solutions**:
1. Check Cloud Run logs: `gcloud run services logs read agentmeter-service --limit=50`
2. Verify environment variables are set correctly
3. Test with manual requests
4. Check Supabase connectivity

## Monitoring and Debugging

### Check Service Status

```bash
# Get service information
gcloud run services describe agentmeter-service --region=us-central1

# View recent logs
gcloud run services logs read agentmeter-service --limit=50

# Check service health
curl -s https://YOUR_SERVICE_URL/health
```

### Testing Deployment

```bash
# Test health endpoint
curl https://YOUR_SERVICE_URL/health

# Test API endpoint
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://YOUR_SERVICE_URL/api/projects
```

## Rollback Procedures

### Quick Rollback

```bash
# List revisions
gcloud run revisions list --service=agentmeter-service --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic agentmeter-service \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

## Getting Help

### Log Analysis

```bash
# Real-time logs
gcloud run services logs tail agentmeter-service --region=us-central1

# Export logs for analysis
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=agentmeter-service" \
  --limit=100 --format=json > deployment-logs.json
```

### Support Resources

1. **Google Cloud Run Documentation**: https://cloud.google.com/run/docs
2. **Supabase Documentation**: https://supabase.io/docs
3. **AgentMeter API Documentation**: See `docs/API.md`

## Next Steps

After successful deployment:

1. Set up monitoring and alerting
2. Configure custom domain (if needed)
3. Set up CI/CD pipeline
4. Implement backup and disaster recovery procedures
5. Scale based on usage patterns

## File Locations

- Simple deployment script: `deployment/scripts/deploy-simple.sh`
- Enhanced deployment script: `deployment/scripts/deploy-enhanced.sh`
- Service source: `service/index.js`
- Built service: `static/service.js`
- Environment template: `service/env.template` 