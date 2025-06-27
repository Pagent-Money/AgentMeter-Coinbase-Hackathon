# 🚀 AgentMeter Hackathon - Google Cloud Run Deployment Guide

This guide will help you deploy the AgentMeter Coinbase Hackathon project to Google Cloud Run for production use.

## 📋 Prerequisites

### 1. Required Tools
- **Google Cloud CLI**: [Install gcloud](https://cloud.google.com/sdk/docs/install)
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 18+**: [Install Node.js](https://nodejs.org/)
- **Git**: For version control

### 2. Google Cloud Setup
1. **Create Google Cloud Project**: 
   ```bash
   # Create new project
   gcloud projects create agentmeter-hackathon --name="AgentMeter Hackathon"
   
   # Set as default project
   gcloud config set project agentmeter-hackathon
   ```

2. **Enable Billing**: Ensure billing is enabled for your project in the [Google Cloud Console](https://console.cloud.google.com/)

3. **Authenticate**: 
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

## 🔐 Secret Management Setup

Before deployment, set up your API keys and secrets in Google Secret Manager:

### 1. Required Secrets
Create the following secrets with your actual values:

```bash
# Supabase Configuration
echo "https://your-project.supabase.co" | gcloud secrets create supabase-url --data-file=-
echo "your_supabase_anon_key" | gcloud secrets create supabase-anon-key --data-file=-
echo "your_supabase_service_role_key" | gcloud secrets create supabase-service-key --data-file=-

# AI API Keys
echo "sk-your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-
echo "sk-your-deepseek-api-key" | gcloud secrets create deepseek-api-key --data-file=-

# Application Secrets
echo "your-jwt-secret-key-here" | gcloud secrets create jwt-secret --data-file=-
```

### 2. Alternative: Create secrets from files
```bash
# If you have secret files
gcloud secrets create openai-api-key --data-file=openai-key.txt
gcloud secrets create supabase-url --data-file=supabase-url.txt
```

## 🚀 Deployment Process

### Option 1: Quick Deployment (Recommended)
```bash
# Deploy to production with automatic setup
npm run deploy:production

# Or deploy to staging
npm run deploy:staging
```

### Option 2: Manual Deployment
```bash
# Set your project ID
export GOOGLE_CLOUD_PROJECT="agentmeter-hackathon"

# Run the deployment script
./deployment/scripts/deploy-hackathon.sh production us-central1 agentmeter-hackathon
```

### Option 3: Cloud Build Deployment
```bash
# Submit build to Google Cloud Build
gcloud builds submit --config=deployment/configs/cloudbuild-enhanced.yaml \
  --substitutions=_ENVIRONMENT=production,_REGION=us-central1
```

## 📊 Deployment Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   Cloud Run         │    │   Secret Manager    │
│   ┌─────────────┐   │    │   ┌─────────────┐   │
│   │  Frontend   │   │    │   │  API Keys   │   │
│   │  (Port 8080)│   │    │   │  Database   │   │
│   └─────────────┘   │    │   │  Config     │   │
│   ┌─────────────┐   │    │   └─────────────┘   │
│   │  Backend    │   │    └─────────────────────┘
│   │  (Port 4021)│   │              │
│   └─────────────┘   │              │
└─────────────────────┘              │
          │                          │
          └──────────────────────────┘
          
┌─────────────────────┐    ┌─────────────────────┐
│   Artifact Registry │    │   Cloud Logging     │
│   ┌─────────────┐   │    │   ┌─────────────┐   │
│   │  Frontend   │   │    │   │  App Logs   │   │
│   │  Image      │   │    │   │  Access     │   │
│   └─────────────┘   │    │   │  Logs       │   │
│   ┌─────────────┐   │    │   └─────────────┘   │
│   │  Backend    │   │    └─────────────────────┘
│   │  Image      │   │
│   └─────────────┘   │
└─────────────────────┘
```

## 🔧 Configuration

### Environment Variables
The deployment automatically sets these environment variables:

**Frontend:**
- `NODE_ENV=production`
- `ENVIRONMENT=production`
- `PORT=8080`
- `BACKEND_URL=[auto-configured service URL]`

**Backend:**
- `NODE_ENV=production`
- `ENVIRONMENT=production`
- `PORT=4021`
- `FRONTEND_URL=[auto-configured frontend URL]`
- `CORS_ORIGINS=[auto-configured origins]`

### Resource Allocation

**Frontend (Cloud Run):**
- Memory: 512Mi
- CPU: 1 vCPU
- Max Instances: 5
- Min Instances: 0
- Concurrency: 100

**Backend (Cloud Run):**
- Memory: 1Gi
- CPU: 2 vCPU
- Max Instances: 10
- Min Instances: 1
- Concurrency: 80

## 📝 Post-Deployment

### 1. Verify Deployment
After deployment, you'll see output like:
```
🚀 AgentMeter Hackathon Deployment Complete!

🔗 Service URLs:
  Frontend:  https://agentmeter-frontend-[ID].run.app
  Backend:   https://agentmeter-service-[ID].run.app

📝 Demo URLs:
  Hackathon Demo: https://agentmeter-frontend-[ID].run.app/coinbase-hackathon
  Dashboard:      https://agentmeter-frontend-[ID].run.app/dashboard
```

### 2. Test the Application
```bash
# Test backend health
curl https://agentmeter-service-[ID].run.app/health

# Test frontend
curl https://agentmeter-frontend-[ID].run.app/

# Test hackathon demo
open https://agentmeter-frontend-[ID].run.app/coinbase-hackathon
```

### 3. Monitor Logs
```bash
# View service logs
gcloud run services logs read agentmeter-service --region us-central1

# View frontend logs
gcloud run services logs read agentmeter-frontend --region us-central1

# Follow live logs
gcloud run services logs tail agentmeter-service --region us-central1
```

## 🔄 Updates and Maintenance

### Update Deployment
```bash
# Make your code changes, then redeploy
npm run deploy:production
```

### Rollback Deployment
```bash
# List previous revisions
gcloud run revisions list --service agentmeter-service --region us-central1

# Rollback to previous revision
gcloud run services update-traffic agentmeter-service \
  --to-revisions [REVISION-NAME]=100 \
  --region us-central1
```

### Update Secrets
```bash
# Update an existing secret
echo "new-secret-value" | gcloud secrets versions add secret-name --data-file=-

# The service will automatically use the latest version
```

## 🌐 Custom Domain (Optional)

### 1. Map Custom Domain
```bash
# Map your domain
gcloud run domain-mappings create \
  --service agentmeter-frontend \
  --domain demo.agentmeter.money \
  --region us-central1
```

### 2. Configure DNS
Add the DNS records shown in the output to your domain registrar.

## 🔍 Troubleshooting

### Common Issues

**1. Build Failures**
```bash
# Check build logs
gcloud builds log [BUILD-ID]

# Verify Docker builds locally
docker build -f deployment/dockerfiles/Dockerfile.service .
```

**2. Service Not Starting**
```bash
# Check service logs
gcloud run services logs read agentmeter-service --region us-central1

# Verify health endpoint
curl https://agentmeter-service-[ID].run.app/health
```

**3. Secret Access Issues**
```bash
# Verify secret exists
gcloud secrets list

# Check IAM permissions
gcloud projects get-iam-policy agentmeter-hackathon
```

### Health Checks
- **Frontend**: `GET /` should return 200
- **Backend**: `GET /health` should return 200
- **API**: `GET /api/health` should return JSON

## 💰 Cost Optimization

### Cloud Run Pricing
- **Pay per use**: Only charged when handling requests
- **Free tier**: 2 million requests per month
- **Cost estimate**: ~$5-20/month for moderate usage

### Optimization Tips
1. **Set min instances to 0** for cost savings (already configured)
2. **Use appropriate CPU/memory** allocation (already optimized)
3. **Monitor usage** in Cloud Console

## 📞 Support

### Getting Help
- **Logs**: Check Cloud Run logs for detailed error messages
- **Documentation**: [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- **Issues**: Create GitHub issues for project-specific problems

### Useful Commands
```bash
# Project info
gcloud config list
gcloud projects describe agentmeter-hackathon

# Service info
gcloud run services describe agentmeter-service --region us-central1

# Resource usage
gcloud run services list --platform managed
```

---

## 🎉 Success!

Your AgentMeter Hackathon demo is now deployed and ready for the Coinbase Agent in Action competition!

**Key Features Available:**
- ✅ Pay-walled article unlock with X402
- ✅ Dual AI chat agents (OpenAI + DeepSeek)
- ✅ Gift card platform with blockchain settlement
- ✅ Real-time cost breakdown and analytics
- ✅ Responsive dashboard and management interface

**Demo URLs to share:**
- Main Demo: `https://your-frontend-url/coinbase-hackathon`
- Dashboard: `https://your-frontend-url/dashboard`

Good luck with your hackathon submission! 🚀 