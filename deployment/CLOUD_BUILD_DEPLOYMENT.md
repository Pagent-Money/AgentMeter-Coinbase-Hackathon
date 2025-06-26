# AgentMeter Cloud Build Deployment

## ✅ Updated for Cloud Build 

The deployment system has been updated to use **Google Cloud Build** instead of local Docker builds, providing better security, scalability, and consistency.

### 🏗️ Cloud Build Benefits

- **No Local Docker Required**: Builds happen entirely in Google Cloud
- **Consistent Environment**: Same build environment every time
- **Better Security**: No need to push images from local machine
- **Faster Builds**: Google's infrastructure optimized for container builds
- **Automatic Image Management**: Built-in integration with Artifact Registry/Container Registry

### 📋 Deployment Options

#### Option 1: Simple Cloud Build Deployment (Recommended)
```bash
npm run deploy:simple
# OR
./deployment/scripts/deploy-simple.sh production us-central1 your-project-id
```

**Features:**
- Uses Google Container Registry (gcr.io)
- Single service deployment
- Streamlined Cloud Build configuration
- Basic resource allocation

#### Option 2: Enhanced Cloud Build Deployment
```bash
npm run deploy:enhanced
# OR
./deployment/scripts/deploy-enhanced.sh production us-central1 your-project-id
```

**Features:**
- Uses Artifact Registry
- Both service and frontend deployment
- Enhanced monitoring and secrets integration
- Advanced resource configuration

### 🔧 Cloud Build Configuration Files

#### Simple Deployment
- **Config**: Generated dynamically in `cloudbuild-simple.yaml`
- **Steps**: Install deps → Build service → Build container → Deploy
- **Images**: `gcr.io/PROJECT_ID/agentmeter-service`

#### Enhanced Deployment  
- **Config**: `deployment/configs/cloudbuild-enhanced.yaml`
- **Steps**: Install deps → Build both apps → Build containers → Deploy both → Setup monitoring
- **Images**: `REGION-docker.pkg.dev/PROJECT_ID/agentmeter-repo/agentmeter-service` and `agentmeter-frontend`

### 🐳 Container Configuration

#### Service Container
- **Dockerfile**: `deployment/dockerfiles/Dockerfile.service`
- **Base Image**: `node:18-alpine`
- **Port**: 8080
- **Health Check**: `/health` endpoint
- **Security**: Non-root user, minimal packages
- **Resources**: 512Mi-1Gi memory, 1 CPU

#### Frontend Container
- **Dockerfile**: `deployment/dockerfiles/Dockerfile.frontend`
- **Base Image**: `node:18-alpine` with nginx
- **Port**: 8080
- **Static Files**: Served via nginx
- **Security**: Non-root user, optimized caching

### ⚙️ Environment Configuration

#### Required APIs
```bash
# Core APIs (required)
gcloud services enable run.googleapis.com --project=PROJECT_ID
gcloud services enable cloudbuild.googleapis.com --project=PROJECT_ID
gcloud services enable containerregistry.googleapis.com --project=PROJECT_ID

# Enhanced APIs (for advanced features)
gcloud services enable artifactregistry.googleapis.com --project=PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=PROJECT_ID
```

#### Environment Variables
Cloud Build automatically sets:
- `NODE_ENV=production`
- `PORT=8080`
- `ENVIRONMENT={staging|production}`

#### Secrets Integration
For production deployments, secrets are automatically pulled from Secret Manager:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 🚀 Deployment Process

#### Simple Deployment Flow
1. **Validate Environment** - Check APIs and permissions
2. **Generate Build Config** - Create `cloudbuild-simple.yaml`
3. **Submit to Cloud Build** - `gcloud builds submit`
4. **Cloud Build Steps**:
   - Install npm dependencies
   - Build service (`npm run build:service`)
   - Build Docker container
   - Push to Container Registry
   - Deploy to Cloud Run
5. **Verify Deployment** - Check service URL and health
6. **Cleanup** - Remove temporary files

#### Enhanced Deployment Flow
1. **Pre-flight Checks** - Requirements, APIs, secrets
2. **Setup Infrastructure** - Artifact Registry, Secret Manager
3. **Run Tests** - Build verification, commercial account tests
4. **Submit Build** - Using pre-configured `cloudbuild-enhanced.yaml`
5. **Cloud Build Steps**:
   - Install dependencies
   - Build service and frontend
   - Build and push containers to Artifact Registry
   - Deploy both services to Cloud Run
   - Setup monitoring and metrics
6. **Post-deployment** - Health checks, traffic management

### 📊 Build Monitoring

#### View Build Logs
```bash
# List recent builds
gcloud builds list --limit=10

# View specific build
gcloud builds log BUILD_ID

# Stream live build logs
gcloud builds log BUILD_ID --stream
```

#### Build Status
- **Console**: https://console.cloud.google.com/cloud-build/builds
- **CLI**: `gcloud builds describe BUILD_ID`
- **Logs**: Cloud Logging automatically captures all build output

### 🔍 Troubleshooting

#### Common Issues

**Build Fails at npm install**
```bash
# Check Node version in cloudbuild.yaml
# Ensure package.json and package-lock.json are committed
```

**Container Push Permission Denied**
```bash
# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Check IAM permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="user:your-email@domain.com" \
    --role="roles/storage.admin"
```

**Cloud Run Deployment Fails**
```bash
# Check Cloud Run API
gcloud services enable run.googleapis.com

# Check service account permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"
```

#### Debug Commands
```bash
# Test local service build
npm run build:service

# Validate Dockerfile
docker build -f deployment/dockerfiles/Dockerfile.service -t test .

# Check Cloud Build permissions
gcloud auth list
gcloud config get-value project
```

### 🎯 Performance Optimizations

#### Build Speed
- **Multi-stage Dockerfiles**: Separate build and runtime stages
- **Layer Caching**: Optimized COPY order in Dockerfiles
- **Parallel Steps**: Independent builds run simultaneously
- **Machine Type**: `E2_HIGHCPU_4` for simple, `E2_HIGHCPU_8` for enhanced

#### Runtime Performance
- **Alpine Linux**: Smaller image size, faster startup
- **Non-root User**: Enhanced security
- **Health Checks**: Proper container lifecycle management
- **Resource Limits**: Optimal memory and CPU allocation

### 📚 Additional Resources

- **Cloud Build Documentation**: https://cloud.google.com/build/docs
- **Container Registry**: https://cloud.google.com/container-registry/docs
- **Cloud Run**: https://cloud.google.com/run/docs
- **Dockerfile Best Practices**: https://docs.docker.com/develop/dev-best-practices/

### 🔧 Customization

#### Modify Build Configuration
Edit `deployment/configs/cloudbuild-enhanced.yaml` or modify the generated config in `deploy-simple.sh`.

#### Change Container Settings
Update Dockerfiles in `deployment/dockerfiles/`:
- `Dockerfile.service` - Backend API service
- `Dockerfile.frontend` - Frontend static files

#### Adjust Cloud Run Settings
Modify deployment commands in Cloud Build configs:
- Memory: `--memory 512Mi`
- CPU: `--cpu 1`
- Concurrency: `--max-instances 10`
- Environment variables: `--set-env-vars`

## ✅ Ready for Cloud Build Deployment

The AgentMeter project is now fully configured for Google Cloud Build deployment with no local Docker dependencies required. 