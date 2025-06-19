# AgentMeter Google Cloud Run Deployment Guide

## Overview

This guide covers deploying both the AgentMeter service and frontend to Google Cloud Run using containerized deployments with automated CI/CD pipelines.

## 🚀 Quick Deploy

For a quick deployment, run:
```bash
./deploy.sh production us-central1
```

## 📋 Prerequisites

### 1. Google Cloud Setup
- Google Cloud account with billing enabled
- Google Cloud project created
- gcloud CLI installed and configured

### 2. Local Requirements
- Docker installed
- Node.js 20+
- Git

### 3. Environment Variables
Set up your environment:
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
gcloud config set project $GOOGLE_CLOUD_PROJECT
```

## 🔧 Manual Deployment Steps

### 1. Enable Required APIs
```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Create Secrets in Secret Manager
```bash
# Supabase credentials
echo "https://your-project.supabase.co" | gcloud secrets create supabase-url --data-file=-
echo "your-anon-key" | gcloud secrets create supabase-anon-key --data-file=-
echo "your-service-role-key" | gcloud secrets create supabase-service-key --data-file=-

# OpenAI API key
echo "sk-your-openai-key" | gcloud secrets create openai-api-key --data-file=-

# Optional: Other API keys
echo "your-api-secret" | gcloud secrets create api-secret-key --data-file=-
```

### 3. Build and Deploy Using Cloud Build
```bash
gcloud builds submit --config=cloudbuild.yaml --substitutions=_REGION=us-central1
```

### 4. Manual Container Deployment (Alternative)

#### Build Service Container
```bash
docker build -f Dockerfile.service -t gcr.io/$GOOGLE_CLOUD_PROJECT/agentmeter-service .
docker push gcr.io/$GOOGLE_CLOUD_PROJECT/agentmeter-service
```

#### Deploy Service to Cloud Run
```bash
gcloud run deploy agentmeter-service \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/agentmeter-service \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 4021 \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,SERVICE_PORT=4021 \
  --set-secrets SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-key:latest,OPENAI_API_KEY=openai-api-key:latest
```

#### Build Frontend Container
```bash
docker build -f Dockerfile.frontend -t gcr.io/$GOOGLE_CLOUD_PROJECT/agentmeter-frontend .
docker push gcr.io/$GOOGLE_CLOUD_PROJECT/agentmeter-frontend
```

#### Deploy Frontend to Cloud Run
```bash
gcloud run deploy agentmeter-frontend \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/agentmeter-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 9090 \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,SERVER_PORT=9090 \
  --set-secrets SUPABASE_URL=supabase-url:latest,SUPABASE_ANON_KEY=supabase-anon-key:latest
```

## 🔐 Security Configuration

### IAM Roles
Ensure proper IAM roles for Cloud Build:
```bash
# Grant Cloud Build access to deploy to Cloud Run
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
  --member="serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant access to Secret Manager
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
  --member="serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### VPC Configuration (Optional)
For additional security, deploy to a VPC connector:
```bash
gcloud compute networks vpc-access connectors create agentmeter-connector \
  --region=us-central1 \
  --subnet=default \
  --subnet-project=$GOOGLE_CLOUD_PROJECT \
  --min-instances=2 \
  --max-instances=3
```

Then add to deployment:
```bash
--vpc-connector=agentmeter-connector
```

## 📊 Monitoring and Logging

### Enable Cloud Monitoring
```bash
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
```

### Create Alerting Policies
```bash
# CPU utilization alert
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring/cpu-alert.yaml

# Error rate alert
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring/error-alert.yaml
```

### View Logs
```bash
# Service logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=agentmeter-service" --limit=50

# Frontend logs  
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=agentmeter-frontend" --limit=50
```

## 🎯 Domain Configuration

### 1. Map Custom Domain
```bash
gcloud run domain-mappings create \
  --service=agentmeter-frontend \
  --domain=app.yourdomain.com \
  --region=us-central1

gcloud run domain-mappings create \
  --service=agentmeter-service \
  --domain=api.yourdomain.com \
  --region=us-central1
```

### 2. Update DNS Records
Add the CNAME records provided by the domain mapping to your DNS provider.

## 🔄 CI/CD Pipeline

### GitHub Actions (Alternative)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - id: 'auth'
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'
          
      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v1'
        
      - name: 'Deploy'
        run: |
          gcloud builds submit --config=cloudbuild.yaml
```

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

#### Service Not Responding
```bash
# Check service status
gcloud run services describe agentmeter-service --region=us-central1

# View real-time logs
gcloud logs tail "resource.type=cloud_run_revision AND resource.labels.service_name=agentmeter-service"
```

#### Secret Access Issues
```bash
# Verify secrets exist
gcloud secrets list

# Check IAM permissions
gcloud secrets get-iam-policy supabase-url
```

### Performance Tuning

#### Adjust Resources
```bash
# Increase memory and CPU
gcloud run services update agentmeter-service \
  --memory=1Gi \
  --cpu=2 \
  --region=us-central1
```

#### Set Concurrency
```bash
# Adjust concurrent requests per instance
gcloud run services update agentmeter-service \
  --concurrency=100 \
  --region=us-central1
```

## 📈 Scaling Configuration

### Auto-scaling Settings
```bash
# Set minimum and maximum instances
gcloud run services update agentmeter-service \
  --min-instances=1 \
  --max-instances=20 \
  --region=us-central1
```

### Load Testing
```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery quick --count 10 --num 5 https://your-service-url.run.app/health
```

## 💰 Cost Optimization

### 1. Set Instance Limits
- Use `--min-instances=0` for development
- Set appropriate `--max-instances` for production

### 2. Resource Right-sizing
- Monitor CPU and memory usage
- Adjust resources based on actual usage

### 3. Request Timeout
```bash
gcloud run services update agentmeter-service \
  --timeout=300 \
  --region=us-central1
```

## 🔄 Updates and Rollbacks

### Rolling Updates
```bash
# Deploy new version
gcloud builds submit --config=cloudbuild.yaml

# Check revision traffic
gcloud run services describe agentmeter-service --region=us-central1
```

### Rollback
```bash
# List revisions
gcloud run revisions list --service=agentmeter-service --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic agentmeter-service \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Container Registry](https://cloud.google.com/container-registry/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Build](https://cloud.google.com/build/docs)

## 🆘 Support

For issues:
1. Check the troubleshooting section above
2. Review Cloud Run logs
3. Verify Supabase connection
4. Check secret configuration

---

**Next Steps After Deployment:**
1. Update DNS records for custom domains
2. Set up monitoring alerts
3. Configure backup strategies
4. Implement blue-green deployments
5. Set up load testing for performance validation 