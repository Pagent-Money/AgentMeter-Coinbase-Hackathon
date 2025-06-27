# AgentMeter Enhanced Deployment Guide

This guide covers the enhanced deployment of AgentMeter to Google Cloud Run with commercial account features.

## 🏗️ Deployment Architecture

### Overview
AgentMeter deploys as two Cloud Run services:
- **Service API** (`agentmeter-service`): Backend API with commercial account management
- **Frontend** (`agentmeter-frontend`): Web interface and dashboard

### Infrastructure Components
- **Google Cloud Run**: Serverless container platform
- **Artifact Registry**: Container image storage
- **Secret Manager**: Secure credential storage
- **Cloud Build**: CI/CD pipeline
- **Supabase**: Database (external)
- **Cloud Monitoring**: Observability

## 📁 Deployment Structure

```
deployment/
├── scripts/
│   ├── deploy.sh                 # Original deployment script
│   ├── deploy-enhanced.sh        # Enhanced deployment script
│   └── deploy-with-logs.sh       # Deployment with logging
├── configs/
│   ├── cloudbuild.yaml          # Original Cloud Build config
│   ├── cloudbuild-enhanced.yaml # Enhanced Cloud Build config
│   └── .dockerignore            # Docker ignore rules
├── dockerfiles/
│   ├── Dockerfile.service       # Service container definition
│   └── Dockerfile.frontend      # Frontend container definition
└── docs/
    └── DEPLOYMENT_GUIDE.md      # This guide
```

## 🚀 Quick Start

### Prerequisites
1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed locally
4. **Node.js 20+** and **Yarn** installed
5. **Supabase account** with database setup

### 1. Clone and Setup
```bash
git clone <repository-url>
cd AgentMeter-Coinbase-Hackathon
yarn install
```

### 2. Configure Environment
```bash
# Set Google Cloud project
export GOOGLE_CLOUD_PROJECT="your-project-id"
gcloud config set project $GOOGLE_CLOUD_PROJECT

# Authenticate
gcloud auth login
gcloud auth application-default login
```

### 3. Deploy
```bash
# Enhanced deployment (recommended)
./deployment/scripts/deploy-enhanced.sh production us-central1

# Or original deployment
./deployment/scripts/deploy.sh production us-central1
```

## 🔧 Deployment Options

### Enhanced Deployment Script
The enhanced deployment script (`deploy-enhanced.sh`) provides:

**Features:**
- ✅ Pre-deployment testing
- ✅ Artifact Registry setup
- ✅ Enhanced secret management
- ✅ Health checks
- ✅ Monitoring setup
- ✅ Blue-green deployment support
- ✅ Comprehensive logging

**Usage:**
```bash
./deployment/scripts/deploy-enhanced.sh [environment] [region] [project_id]

# Examples:
./deployment/scripts/deploy-enhanced.sh staging us-central1
./deployment/scripts/deploy-enhanced.sh production europe-west1 my-project
```

### Standard Deployment Script
The standard deployment script (`deploy.sh`) provides basic deployment functionality:

```bash
./deployment/scripts/deploy.sh [environment] [region]
```

## 🔐 Secret Management

### Required Secrets
The deployment creates these secrets in Google Secret Manager:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `supabase-url` | Supabase project URL | ✅ |
| `supabase-anon-key` | Supabase anonymous key | ✅ |
| `supabase-service-key` | Supabase service role key | ✅ |
| `openai-api-key` | OpenAI API key | ✅ |
| `jwt-secret` | JWT signing secret for API keys | ✅ |
| `webhook-secret` | Webhook validation secret | ⚠️ |
| `rate-limit-redis-url` | Redis URL for rate limiting | ⚠️ |

### Setting Up Secrets
1. **Automatic Creation**: The deployment script creates placeholder secrets
2. **Manual Update**: Update with actual values:

```bash
# Update Supabase URL
echo "https://your-project.supabase.co" | \
  gcloud secrets versions add supabase-url --data-file=-

# Update Supabase service key
echo "your-service-role-key" | \
  gcloud secrets versions add supabase-service-key --data-file=-

# Update OpenAI API key
echo "sk-your-openai-key" | \
  gcloud secrets versions add openai-api-key --data-file=-

# Generate and set JWT secret
openssl rand -base64 32 | \
  gcloud secrets versions add jwt-secret --data-file=-
```

## 🐳 Container Configuration

### Service Container
- **Base Image**: `node:20-alpine`
- **Port**: 4021
- **Memory**: 1Gi
- **CPU**: 1 vCPU
- **Max Instances**: 20
- **Concurrency**: 100

### Frontend Container
- **Base Image**: `node:20-alpine`
- **Port**: 9090
- **Memory**: 512Mi
- **CPU**: 1 vCPU
- **Max Instances**: 10
- **Concurrency**: 80

### Build Features
- Multi-stage builds for optimization
- Security-hardened containers
- Health checks
- Build metadata injection
- Non-root user execution

## 🔄 CI/CD Pipeline

### Cloud Build Configuration
The enhanced Cloud Build pipeline includes:

1. **Dependency Installation**
2. **Unit Testing**
3. **Container Building** with metadata
4. **Image Pushing** to Artifact Registry
5. **Service Deployment** with health checks
6. **Traffic Management** (blue-green for production)
7. **Post-deployment Validation**

### Build Triggers
```bash
# Trigger builds automatically
gcloud builds triggers create github \
  --repo-name=AgentMeter-Coinbase-Hackathon \
  --repo-owner=your-username \
  --branch-pattern="^main$" \
  --build-config=deployment/configs/cloudbuild-enhanced.yaml
```

## 📊 Monitoring and Observability

### Built-in Monitoring
The deployment sets up:
- **Health Checks**: Automatic service health monitoring
- **Log-based Metrics**: Custom metrics for commercial accounts
- **Error Tracking**: Application error monitoring
- **Performance Monitoring**: Request latency and throughput

### Custom Metrics
- `account_registrations`: Commercial account creation count
- `api_key_creations`: API key generation count
- `error_rate`: Application error rate

### Accessing Logs
```bash
# View service logs
gcloud logs read "resource.type=cloud_run_revision" \
  --filter='resource.labels.service_name=agentmeter-service' \
  --limit=50

# View frontend logs
gcloud logs read "resource.type=cloud_run_revision" \
  --filter='resource.labels.service_name=agentmeter-frontend' \
  --limit=50
```

## 🧪 Testing Deployment

### Health Check
```bash
SERVICE_URL=$(gcloud run services describe agentmeter-service \
  --region=us-central1 \
  --format="value(status.url)")

curl $SERVICE_URL/health
```

### Commercial Account API
```bash
# Test account registration
curl -X POST $SERVICE_URL/api/accounts/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "company_name": "Test Company"
  }'
```

### Integration Tests
```bash
# Run tests against deployed service
TEST_BASE_URL=$SERVICE_URL npm run test:integration
```

## 🔄 Traffic Management

### Blue-Green Deployment
For production deployments, the system supports blue-green deployment:

```bash
# Deploy with 10% traffic to new revision
gcloud run services update-traffic agentmeter-service \
  --region=us-central1 \
  --to-revisions=NEW_REVISION=10,LATEST=90

# Verify new revision works correctly
# Then route all traffic to new revision
gcloud run services update-traffic agentmeter-service \
  --region=us-central1 \
  --to-latest
```

### Rollback
```bash
# List revisions
gcloud run revisions list --service=agentmeter-service --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic agentmeter-service \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

## 🔧 Configuration Management

### Environment Variables
Services are configured with these environment variables:

**Service:**
- `NODE_ENV=production`
- `SERVICE_PORT=4021`
- `ENVIRONMENT=${_ENVIRONMENT}`
- `BUILD_TIME=${_BUILD_TIME}`
- `COMMIT_SHA=${_COMMIT_SHA}`

**Frontend:**
- `NODE_ENV=production`
- `SERVER_PORT=9090`
- `ENVIRONMENT=${_ENVIRONMENT}`
- `BUILD_TIME=${_BUILD_TIME}`
- `COMMIT_SHA=${_COMMIT_SHA}`

### Custom Domains
```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=agentmeter-service \
  --domain=api.yourdomain.com \
  --region=us-central1

gcloud run domain-mappings create \
  --service=agentmeter-frontend \
  --domain=app.yourdomain.com \
  --region=us-central1
```

## 🔍 Troubleshooting

### Common Issues

**1. Secret Access Errors**
```bash
# Check service account permissions
gcloud projects get-iam-policy $GOOGLE_CLOUD_PROJECT \
  --format="table(bindings.members)" \
  --filter="bindings.role:roles/secretmanager.secretAccessor"
```

**2. Build Failures**
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>
```

**3. Service Not Starting**
```bash
# Check service logs
gcloud run services logs read agentmeter-service \
  --region=us-central1 \
  --limit=50
```

**4. Database Connection Issues**
- Verify Supabase credentials in Secret Manager
- Check network connectivity
- Validate database schema migration

### Debug Commands
```bash
# Check service status
gcloud run services describe agentmeter-service --region=us-central1

# Check container logs
gcloud run services logs tail agentmeter-service --region=us-central1

# Test container locally
docker run -p 4021:4021 \
  -e SUPABASE_URL="your-url" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-key" \
  your-region-docker.pkg.dev/your-project/agentmeter-repo/agentmeter-service:latest
```

## 📚 Additional Resources

### Documentation Links
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)

### Support
- Check the [troubleshooting section](#troubleshooting)
- Review Cloud Run service logs
- Validate database connectivity
- Test API endpoints manually

### Cost Optimization
- Use minimum instances for development
- Configure appropriate memory/CPU limits
- Set up budget alerts
- Monitor usage with Cloud Monitoring

---

**Note**: This deployment guide covers the enhanced commercial account system. Ensure your Supabase database has the required schema for commercial accounts before deploying. 