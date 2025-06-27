#!/bin/bash

# AgentMeter Coinbase Hackathon - Google Cloud Run Deployment Script
# Usage: ./deploy-hackathon.sh [environment] [region] [project_id]
# Example: ./deploy-hackathon.sh production us-central1 agentmeter-hackathon

set -e

# Default values
ENVIRONMENT=${1:-production}
REGION=${2:-us-central1}
PROJECT_ID=${3:-${GOOGLE_CLOUD_PROJECT:-""}}

# Application configuration
APP_NAME="agentmeter"
SERVICE_NAME="${APP_NAME}-service"
FRONTEND_NAME="${APP_NAME}-frontend"
REPO_NAME="agentmeter-repo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_detail() {
    echo -e "${CYAN}[DETAIL]${NC} $1"
}

# Print banner
print_banner() {
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║     AgentMeter Hackathon Deploy     ║"
    echo "║      Coinbase Agent in Action       ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Region:      $REGION"
    echo "Project:     $PROJECT_ID"
    echo "Timestamp:   $(date)"
    echo "=============================================="
}

# Check requirements
check_requirements() {
    log_step "Checking deployment requirements..."
    
    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    log_detail "✓ gcloud CLI found: $(gcloud --version | head -n1)"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    log_detail "✓ Docker found: $(docker --version)"
    
    # Check Node.js and npm
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    log_detail "✓ Node.js found: $(node --version)"
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install it first."
        exit 1
    fi
    log_detail "✓ npm found: $(npm --version)"
    
    # Validate project ID
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
        if [ -z "$PROJECT_ID" ]; then
            log_error "Google Cloud project ID not set. Set GOOGLE_CLOUD_PROJECT environment variable or run 'gcloud config set project PROJECT_ID'"
            exit 1
        fi
    fi
    log_detail "✓ Project ID: $PROJECT_ID"
    
    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 | grep -q "@"; then
        log_error "Not authenticated with gcloud. Run 'gcloud auth login'"
        exit 1
    fi
    ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1)
    log_detail "✓ Authenticated as: $ACTIVE_ACCOUNT"
    
    log_success "All requirements satisfied"
}

# Setup Google Cloud environment
setup_gcloud_environment() {
    log_step "Setting up Google Cloud environment..."
    
    # Set project
    gcloud config set project $PROJECT_ID
    log_detail "✓ Project set to $PROJECT_ID"
    
    # Enable required APIs
    log_info "Enabling required Google Cloud APIs..."
    
    REQUIRED_APIS=(
        "cloudbuild.googleapis.com"
        "run.googleapis.com"
        "containerregistry.googleapis.com"
        "secretmanager.googleapis.com"
        "artifactregistry.googleapis.com"
        "logging.googleapis.com"
        "monitoring.googleapis.com"
        "storage.googleapis.com"
    )
    
    for api in "${REQUIRED_APIS[@]}"; do
        if gcloud services enable $api --project=$PROJECT_ID 2>/dev/null; then
            log_detail "✓ Enabled: $api"
        else
            log_warning "Could not enable $api - may already be enabled or require billing setup"
        fi
    done
    
    log_success "Google Cloud environment configured"
}

# Setup Artifact Registry
setup_artifact_registry() {
    log_step "Setting up Artifact Registry..."
    
    # Check if repository exists
    if ! gcloud artifacts repositories describe $REPO_NAME \
        --location=$REGION \
        --project=$PROJECT_ID &>/dev/null; then
        
        log_info "Creating Artifact Registry repository..."
        gcloud artifacts repositories create $REPO_NAME \
            --repository-format=docker \
            --location=$REGION \
            --description="AgentMeter Hackathon Docker images" \
            --project=$PROJECT_ID
        
        log_success "Artifact Registry repository created"
    else
        log_detail "✓ Artifact Registry repository already exists"
    fi
    
    # Configure Docker authentication
    gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
    log_detail "✓ Docker authentication configured"
}

# Setup required secrets
setup_secrets() {
    log_step "Setting up Secret Manager secrets..."
    
    # Define required secrets
    SECRET_NAMES=(
        "supabase-url"
        "supabase-anon-key" 
        "supabase-service-key"
        "openai-api-key"
        "deepseek-api-key"
        "jwt-secret"
    )
    
    for secret_name in "${SECRET_NAMES[@]}"; do
        if ! gcloud secrets describe $secret_name --project=$PROJECT_ID &>/dev/null; then
            log_info "Creating secret: $secret_name"
            
            # Create secret with placeholder value
            echo "CHANGE_ME_${secret_name^^}" | gcloud secrets create $secret_name \
                --data-file=- \
                --project=$PROJECT_ID
            
            log_warning "⚠️  Secret '$secret_name' created with placeholder value. Please update it with the real value:"
            log_detail "   gcloud secrets versions add $secret_name --data-file=- < your_secret_file"
        else
            log_detail "✓ Secret '$secret_name' already exists"
        fi
    done
    
    log_success "Secret Manager setup completed"
}

# Build and push application
build_and_push() {
    log_step "Building and pushing application..."
    
    # Get current git commit
    COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    BUILD_ID=$(date +%s)
    
    log_info "Build metadata:"
    log_detail "  Commit SHA: $COMMIT_SHA"
    log_detail "  Build Time: $BUILD_TIME"
    log_detail "  Build ID: $BUILD_ID"
    
    # Build project
    log_info "Installing dependencies..."
    npm install
    
    log_info "Building service..."
    npm run build:service
    
    log_info "Building frontend..."
    npm run build:client
    
    # Build and push service container
    log_info "Building service container..."
    SERVICE_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${ENVIRONMENT}-${BUILD_ID}"
    
    docker build \
        -t $SERVICE_IMAGE \
        -f deployment/dockerfiles/Dockerfile.service \
        --build-arg COMMIT_SHA=$COMMIT_SHA \
        --build-arg BUILD_TIME=$BUILD_TIME \
        --build-arg ENVIRONMENT=$ENVIRONMENT \
        .
    
    log_info "Pushing service container..."
    docker push $SERVICE_IMAGE
    
    # Build and push frontend container
    log_info "Building frontend container..."
    FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${FRONTEND_NAME}:${ENVIRONMENT}-${BUILD_ID}"
    
    docker build \
        -t $FRONTEND_IMAGE \
        -f deployment/dockerfiles/Dockerfile.frontend \
        --build-arg COMMIT_SHA=$COMMIT_SHA \
        --build-arg BUILD_TIME=$BUILD_TIME \
        --build-arg ENVIRONMENT=$ENVIRONMENT \
        .
    
    log_info "Pushing frontend container..."
    docker push $FRONTEND_IMAGE
    
    log_success "Build and push completed"
}

# Deploy to Cloud Run
deploy_services() {
    log_step "Deploying services to Cloud Run..."
    
    # Deploy service
    log_info "Deploying backend service..."
    gcloud run deploy $SERVICE_NAME \
        --image $SERVICE_IMAGE \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --port 4021 \
        --memory 1Gi \
        --cpu 2 \
        --max-instances 10 \
        --min-instances 1 \
        --timeout 300s \
        --concurrency 80 \
        --set-env-vars "NODE_ENV=production,ENVIRONMENT=${ENVIRONMENT},PORT=4021" \
        --set-secrets "SUPABASE_URL=supabase-url:latest,SUPABASE_ANON_KEY=supabase-anon-key:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-key:latest,OPENAI_API_KEY=openai-api-key:latest,DEEPSEEK_API_KEY=deepseek-api-key:latest,JWT_SECRET=jwt-secret:latest" \
        --labels "environment=${ENVIRONMENT},component=service,commit=${COMMIT_SHA},project=agentmeter-hackathon" \
        --project=$PROJECT_ID
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" --project=$PROJECT_ID)
    log_detail "✓ Service deployed to: $SERVICE_URL"
    
    # Deploy frontend
    log_info "Deploying frontend..."
    gcloud run deploy $FRONTEND_NAME \
        --image $FRONTEND_IMAGE \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --port 8080 \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 5 \
        --min-instances 0 \
        --timeout 60s \
        --concurrency 100 \
        --set-env-vars "NODE_ENV=production,ENVIRONMENT=${ENVIRONMENT},PORT=8080,BACKEND_URL=${SERVICE_URL}" \
        --labels "environment=${ENVIRONMENT},component=frontend,commit=${COMMIT_SHA},project=agentmeter-hackathon" \
        --project=$PROJECT_ID
    
    # Get frontend URL
    FRONTEND_URL=$(gcloud run services describe $FRONTEND_NAME --region $REGION --format="value(status.url)" --project=$PROJECT_ID)
    log_detail "✓ Frontend deployed to: $FRONTEND_URL"
    
    # Update service with CORS origins
    log_info "Updating service with CORS configuration..."
    gcloud run services update $SERVICE_NAME \
        --region $REGION \
        --update-env-vars "FRONTEND_URL=${FRONTEND_URL},CORS_ORIGINS=${FRONTEND_URL}" \
        --project=$PROJECT_ID
    
    log_success "Services deployed successfully"
}

# Health checks and final output
final_checks() {
    log_step "Performing health checks..."
    
    # Wait a moment for services to start
    sleep 10
    
    # Check service health
    if curl -f -s "${SERVICE_URL}/health" > /dev/null; then
        log_detail "✓ Service health check passed"
    else
        log_warning "⚠️  Service health check failed"
    fi
    
    # Check frontend
    if curl -f -s "${FRONTEND_URL}/" > /dev/null; then
        log_detail "✓ Frontend health check passed"
    else
        log_warning "⚠️  Frontend health check failed"
    fi
    
    # Display final information
    echo ""
    echo "🚀 AgentMeter Hackathon Deployment Complete!"
    echo ""
    echo "🔗 Service URLs:"
    echo "  Frontend:  $FRONTEND_URL"
    echo "  Backend:   $SERVICE_URL"
    echo ""
    echo "📝 Demo URLs:"
    echo "  Hackathon Demo: $FRONTEND_URL/coinbase-hackathon"
    echo "  Dashboard:      $FRONTEND_URL/dashboard"
    echo "  Case Studies:   $FRONTEND_URL/case-studies"
    echo ""
    echo "🔧 Management:"
    echo "  View logs:    gcloud run services logs read $SERVICE_NAME --region $REGION"
    echo "  Update code:  Re-run this script with your changes"
    echo "  Rollback:     gcloud run services update $SERVICE_NAME --region $REGION --image [previous-image]"
    echo ""
    echo "💡 Next Steps:"
    echo "  1. Update Secret Manager with real API keys"
    echo "  2. Configure custom domain (optional)"
    echo "  3. Set up monitoring and alerts"
    echo "  4. Test the hackathon demo thoroughly"
    echo ""
    
    log_success "Deployment completed successfully! 🎉"
}

# Main execution
main() {
    print_banner
    check_requirements
    setup_gcloud_environment
    setup_artifact_registry
    setup_secrets
    build_and_push
    deploy_services
    final_checks
}

# Run the deployment
main "$@" 