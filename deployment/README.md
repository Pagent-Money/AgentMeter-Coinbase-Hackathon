# AgentMeter Deployment

This directory contains all deployment-related files and scripts for AgentMeter's Google Cloud Run deployment.

## 📁 Directory Structure

```
deployment/
├── README.md                    # This file
├── scripts/                     # Deployment and maintenance scripts
│   ├── deploy.sh               # Standard deployment script
│   ├── deploy-enhanced.sh      # Enhanced deployment with monitoring
│   ├── deploy-with-logs.sh     # Deployment with detailed logging
│   └── maintenance.sh          # Maintenance and management utilities
├── configs/                    # Configuration files
│   ├── cloudbuild.yaml        # Standard Cloud Build pipeline
│   ├── cloudbuild-enhanced.yaml # Enhanced pipeline with testing
│   └── .dockerignore          # Docker ignore patterns
├── dockerfiles/               # Container definitions
│   ├── Dockerfile.service     # Service container
│   └── Dockerfile.frontend    # Frontend container
└── docs/                      # Deployment documentation
    └── DEPLOYMENT_GUIDE.md    # Comprehensive deployment guide
```

## 🚀 Quick Deploy

### Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed locally
- Node.js 20+ and Yarn

### One-Command Deploy
```bash
# Enhanced deployment (recommended)
./deployment/scripts/deploy-enhanced.sh production us-central1

# Standard deployment
./deployment/scripts/deploy.sh production us-central1
```

## 📜 Available Scripts

### Deployment Scripts

#### `deploy-enhanced.sh` (Recommended)
Full-featured deployment with:
- Pre-deployment testing
- Artifact Registry setup
- Secret management
- Health checks
- Monitoring setup
- Blue-green deployment support

```bash
./deployment/scripts/deploy-enhanced.sh [environment] [region] [project_id]

# Examples:
./deployment/scripts/deploy-enhanced.sh staging us-central1
./deployment/scripts/deploy-enhanced.sh production europe-west1 my-project
```

#### `deploy.sh` (Standard)
Basic deployment script for simple use cases:

```bash
./deployment/scripts/deploy.sh [environment] [region]
```

#### `deploy-with-logs.sh`
Deployment with enhanced logging and debugging output:

```bash
./deployment/scripts/deploy-with-logs.sh [environment] [region]
```

### Maintenance Script

#### `maintenance.sh`
Comprehensive maintenance and management utilities:

```bash
# Check deployment status
./deployment/scripts/maintenance.sh status

# View logs
./deployment/scripts/maintenance.sh logs service
./deployment/scripts/maintenance.sh logs frontend

# Scale services
./deployment/scripts/maintenance.sh scale agentmeter-service 1 10

# Rollback to previous version
./deployment/scripts/maintenance.sh rollback agentmeter-service

# Manage secrets
./deployment/scripts/maintenance.sh secrets

# Health checks
./deployment/scripts/maintenance.sh health

# Clean up old revisions
./deployment/scripts/maintenance.sh cleanup

# Traffic management
./deployment/scripts/maintenance.sh traffic agentmeter-service revision-abc123 50
```

## 🐳 Container Configurations

### Service Container (`Dockerfile.service`)
- **Base**: `node:20-alpine`
- **Features**: Multi-stage build, security hardening, health checks
- **Port**: 4021
- **Resources**: 1Gi memory, 1 vCPU
- **Commercial Account Features**: API key management, rate limiting

### Frontend Container (`Dockerfile.frontend`)
- **Base**: `node:20-alpine`
- **Features**: Multi-stage build, optimized for serving static assets
- **Port**: 9090
- **Resources**: 512Mi memory, 1 vCPU

## 🔄 CI/CD Pipelines

### Enhanced Pipeline (`cloudbuild-enhanced.yaml`)
- Dependency installation and testing
- Multi-stage container builds with metadata
- Artifact Registry storage
- Health checks and validation
- Blue-green deployment for production
- Post-deployment monitoring setup

### Standard Pipeline (`cloudbuild.yaml`)
- Basic build and deploy workflow
- Container Registry storage
- Simple deployment strategy

## 🔐 Secret Management

Required secrets in Google Secret Manager:

| Secret | Description | Required |
|--------|-------------|----------|
| `supabase-url` | Supabase project URL | ✅ |
| `supabase-anon-key` | Public anonymous key | ✅ |
| `supabase-service-key` | Service role key | ✅ |
| `openai-api-key` | OpenAI API key | ✅ |
| `jwt-secret` | JWT signing secret | ✅ |
| `webhook-secret` | Webhook validation | ⚠️ |
| `rate-limit-redis-url` | Redis for rate limiting | ⚠️ |

### Setting Secrets

```bash
# Supabase configuration
echo "https://your-project.supabase.co" | \
  gcloud secrets versions add supabase-url --data-file=-

echo "your-service-role-key" | \
  gcloud secrets versions add supabase-service-key --data-file=-

# Generate JWT secret
openssl rand -base64 32 | \
  gcloud secrets versions add jwt-secret --data-file=-
```

## 📊 Monitoring and Observability

### Built-in Metrics
- Account registrations
- API key creations
- Error rates
- Request latency

### Health Endpoints
- Service: `https://your-service-url/health`
- Frontend: `https://your-frontend-url/`

### Log Access
```bash
# Service logs
gcloud logs read "resource.type=cloud_run_revision" \
  --filter='resource.labels.service_name=agentmeter-service'

# Frontend logs
gcloud logs read "resource.type=cloud_run_revision" \
  --filter='resource.labels.service_name=agentmeter-frontend'
```

## 🔧 Configuration Options

### Environment Variables

**Service:**
- `NODE_ENV=production`
- `SERVICE_PORT=4021`
- `ENVIRONMENT=${ENVIRONMENT}`
- `BUILD_TIME=${BUILD_TIME}`
- `COMMIT_SHA=${COMMIT_SHA}`

**Frontend:**
- `NODE_ENV=production`
- `SERVER_PORT=9090`
- `ENVIRONMENT=${ENVIRONMENT}`

### Resource Allocation

**Production:**
- Service: 1Gi memory, 1 vCPU, max 20 instances
- Frontend: 512Mi memory, 1 vCPU, max 10 instances

**Development:**
- Reduced resources with min instances = 0

## 🔄 Deployment Strategies

### Blue-Green Deployment (Production)
1. Deploy new revision with 10% traffic
2. Monitor metrics and health
3. Gradually increase traffic to 100%
4. Keep previous revision for rollback

### Rolling Updates (Staging)
1. Deploy new revision
2. Route all traffic immediately
3. Monitor for issues

### Rollback Process
```bash
# List revisions
./deployment/scripts/maintenance.sh status

# Rollback to previous
./deployment/scripts/maintenance.sh rollback agentmeter-service
```

## 🧪 Testing

### Pre-deployment Tests
- Unit test execution
- Build verification
- Container image validation

### Post-deployment Tests
- Health endpoint verification
- Commercial account API testing
- Integration test execution

### Manual Testing
```bash
# Health check
curl https://your-service-url/health

# Account registration test
curl -X POST https://your-service-url/api/accounts/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","full_name":"Test User","company_name":"Test Co"}'
```

## 🎯 Production Checklist

Before deploying to production:

- [ ] All secrets configured in Secret Manager
- [ ] Supabase database schema migrated
- [ ] Domain names configured (if using custom domains)
- [ ] Monitoring alerts set up
- [ ] Backup strategies in place
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated

## 🔍 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

**Service Not Starting:**
```bash
# Check service logs
./deployment/scripts/maintenance.sh logs service

# Check resource allocation
./deployment/scripts/maintenance.sh status
```

**Secret Access Issues:**
```bash
# Verify secrets exist
./deployment/scripts/maintenance.sh secrets

# Check IAM permissions
gcloud projects get-iam-policy PROJECT_ID
```

### Debug Commands
```bash
# Full deployment status
./deployment/scripts/maintenance.sh status

# Live log streaming
gcloud run services logs tail agentmeter-service --region=us-central1

# Test container locally
docker run -p 4021:4021 \
  -e SUPABASE_URL="your-url" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-key" \
  gcr.io/PROJECT_ID/agentmeter-service:latest
```

## 🔗 Related Documentation

- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [Commercial Accounts Guide](../docs/COMMERCIAL_ACCOUNTS_GUIDE.md) - Commercial account system
- [API Documentation](../docs/API.md) - API reference
- [Testing Summary](../docs/TESTING_SUMMARY.md) - Testing documentation

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review deployment logs with `maintenance.sh logs`
3. Verify secret configuration with `maintenance.sh secrets`
4. Test health endpoints with `maintenance.sh health`

---

**Note**: This deployment system supports the enhanced commercial account features. Ensure your database schema includes the commercial accounts migration before deploying to production. 