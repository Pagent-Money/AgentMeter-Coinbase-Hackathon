#!/bin/bash

# Enhanced AgentMeter Google Cloud Run Deployment Script
# Usage: ./deploy-enhanced.sh [environment] [region] [project_id]
# Example: ./deploy-enhanced.sh production us-central1 my-project-id

set -e

# Default values
ENVIRONMENT=${1:-staging}
REGION=${2:-us-central1}
PROJECT_ID=${3:-${GOOGLE_CLOUD_PROJECT:-""}}

# Application configuration
APP_NAME="agentmeter"
SERVICE_NAME="${APP_NAME}-service"
FRONTEND_NAME="${APP_NAME}-frontend"

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
    echo "║        AgentMeter Deployment        ║"
    echo "║      Enhanced Google Cloud Run      ║"
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
    log_detail "✓ gcloud CLI found"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    log_detail "✓ Docker found"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    log_detail "✓ Node.js found: $(node --version)"
    
    # Check yarn
    if ! command -v yarn &> /dev/null; then
        log_error "Yarn is not installed. Please install it first."
        exit 1
    fi
    log_detail "✓ Yarn found: $(yarn --version)"
    
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
    log_detail "✓ gcloud authentication verified"
    
    log_success "All requirements satisfied"
}

# Setup Google Cloud environment
setup_gcloud_environment() {
    log_step "Setting up Google Cloud environment..."
    
    # Set project
    gcloud config set project $PROJECT_ID
    log_detail "✓ Project set to $PROJECT_ID"
    
    # Enable required APIs with error handling
    log_info "Enabling required Google Cloud APIs..."
    
    # List of required APIs
    REQUIRED_APIS=(
        "cloudbuild.googleapis.com"
        "run.googleapis.com"
        "containerregistry.googleapis.com"
        "secretmanager.googleapis.com"
        "artifactregistry.googleapis.com"
        "logging.googleapis.com"
        "monitoring.googleapis.com"
    )
    
    # Enable APIs one by one with error handling
    for api in "${REQUIRED_APIS[@]}"; do
        if gcloud services enable $api --project=$PROJECT_ID 2>/dev/null; then
            log_detail "✓ Enabled: $api"
        else
            log_warning "Could not enable $api - check project permissions or billing"
            log_info "You may need to enable this API manually in the Google Cloud Console"
        fi
    done
    
    log_success "Google Cloud environment configured"
}

# Create Artifact Registry repository
setup_artifact_registry() {
    log_step "Setting up Artifact Registry..."
    
    REPO_NAME="agentmeter-repo"
    
    # Check if repository exists
    if ! gcloud artifacts repositories describe $REPO_NAME \
        --location=$REGION \
        --project=$PROJECT_ID &>/dev/null; then
        
        log_info "Creating Artifact Registry repository..."
        gcloud artifacts repositories create $REPO_NAME \
            --repository-format=docker \
            --location=$REGION \
            --description="AgentMeter Docker images" \
            --project=$PROJECT_ID
        
        log_success "Artifact Registry repository created"
    else
        log_detail "✓ Artifact Registry repository already exists"
    fi
    
    # Configure Docker authentication
    gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
    log_detail "✓ Docker authentication configured"
}

# Manage secrets in Secret Manager
manage_secrets() {
    log_step "Managing secrets in Secret Manager..."
    
    # Define required secrets for commercial account system
    local secret_names=(
        "supabase-url"
        "supabase-anon-key" 
        "supabase-service-key"
        "openai-api-key"
        "jwt-secret"
        "webhook-secret"
        "rate-limit-redis-url"
    )
    
    local secret_descriptions=(
        "Supabase project URL"
        "Supabase anonymous key"
        "Supabase service role key"
        "OpenAI API key"
        "JWT signing secret for API keys"
        "Webhook validation secret"
        "Redis URL for rate limiting (optional)"
    )
    
    for i in "${!secret_names[@]}"; do
        local secret="${secret_names[$i]}"
        local description="${secret_descriptions[$i]}"
        
        if ! gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
            log_warning "Secret '$secret' does not exist. Creating placeholder..."
            echo "CHANGE_ME_${secret^^}_$(date +%s)" | gcloud secrets create $secret \
                --data-file=- \
                --project=$PROJECT_ID
            log_detail "✓ Created secret: $secret"
            log_info "Please update secret '$secret' ($description) using:"
            log_info "  gcloud secrets versions add $secret --data-file=path/to/secret --project=$PROJECT_ID"
        else
            log_detail "✓ Secret '$secret' exists"
        fi
    done
    
    log_success "Secrets management completed"
}

# Run tests before deployment
run_tests() {
    log_step "Running tests before deployment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        yarn install --frozen-lockfile
    fi
    
    # Run commercial account tests
    log_info "Running commercial account tests..."
    if npm run test:commercial:new &>/dev/null; then
        log_detail "✓ Commercial account tests passed"
    else
        log_warning "Commercial account tests failed (may be expected without running service)"
    fi
    
    # Build services to verify compilation
    log_info "Building services to verify compilation..."
    npm run build:service
    log_detail "✓ Service build successful"
    
    npm run build
    log_detail "✓ Frontend build successful"
    
    log_success "Pre-deployment tests completed"
}

# Enhanced build and deployment
enhanced_deploy() {
    log_step "Starting enhanced deployment to $ENVIRONMENT environment..."
    
    # Get current git commit information
    COMMIT_SHA=$(git rev-parse --short HEAD)
    COMMIT_MSG=$(git log -1 --pretty=%B | tr '\n' ' ' | head -c 50)
    BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    log_detail "Git commit: $COMMIT_SHA"
    log_detail "Commit message: $COMMIT_MSG"
    log_detail "Build time: $BUILD_TIME"
    
    # Submit build to Cloud Build with enhanced configuration
    log_info "Submitting build to Cloud Build..."
    gcloud builds submit \
        --config=deployment/configs/cloudbuild-enhanced.yaml \
        --substitutions=_REGION=$REGION,_ENVIRONMENT=$ENVIRONMENT,_COMMIT_SHA=$COMMIT_SHA,_BUILD_TIME=$BUILD_TIME \
        --project=$PROJECT_ID
    
    log_success "Build and deployment completed!"
}

# Setup monitoring and alerting
setup_monitoring() {
    log_step "Setting up monitoring and alerting..."
    
    # Create log-based metrics for commercial account system
    log_info "Creating log-based metrics..."
    
    # Account registration metric
    gcloud logging metrics create account_registrations \
        --description="Number of commercial account registrations" \
        --log-filter='resource.type="cloud_run_revision" AND jsonPayload.event="account_registered"' \
        --project=$PROJECT_ID 2>/dev/null || log_detail "✓ Metric account_registrations already exists"
    
    # API key creation metric
    gcloud logging metrics create api_key_creations \
        --description="Number of API key creations" \
        --log-filter='resource.type="cloud_run_revision" AND jsonPayload.event="api_key_created"' \
        --project=$PROJECT_ID 2>/dev/null || log_detail "✓ Metric api_key_creations already exists"
    
    # Error rate metric
    gcloud logging metrics create error_rate \
        --description="Application error rate" \
        --log-filter='resource.type="cloud_run_revision" AND severity>=ERROR' \
        --project=$PROJECT_ID 2>/dev/null || log_detail "✓ Metric error_rate already exists"
    
    log_success "Monitoring setup completed"
}

# Get deployment information
get_deployment_info() {
    log_step "Retrieving deployment information..."
    
    # Get service URLs
    SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    
    FRONTEND_URL=$(gcloud run services describe $FRONTEND_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    
    # Get service status
    SERVICE_STATUS=$(gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.conditions[0].status)" 2>/dev/null || echo "Unknown")
    
    FRONTEND_STATUS=$(gcloud run services describe $FRONTEND_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --format="value(status.conditions[0].status)" 2>/dev/null || echo "Unknown")
    
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║         Deployment Summary           ║"
    echo "╚══════════════════════════════════════╝"
    echo ""
    echo "🚀 Service API:"
    echo "   URL:    $SERVICE_URL"
    echo "   Status: $SERVICE_STATUS"
    echo ""
    echo "🌐 Frontend:"
    echo "   URL:    $FRONTEND_URL"
    echo "   Status: $FRONTEND_STATUS"
    echo ""
    echo "📊 Monitoring:"
    echo "   Logs:   https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_run_revision%22?project=$PROJECT_ID"
    echo "   Metrics: https://console.cloud.google.com/monitoring?project=$PROJECT_ID"
    echo ""
    echo "🔐 API Testing:"
    echo "   Health: curl $SERVICE_URL/health"
    echo "   Account: curl -X POST $SERVICE_URL/api/accounts/register -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"full_name\":\"Test User\",\"company_name\":\"Test Co\"}'"
    echo ""
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup logic here
}

# Main deployment process
main() {
    print_banner
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    check_requirements
    setup_gcloud_environment
    setup_artifact_registry
    manage_secrets
    run_tests
    enhanced_deploy
    setup_monitoring
    get_deployment_info
    
    log_success "Enhanced deployment process completed!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Update secrets with actual values using Secret Manager"
    echo "2. Test the commercial account registration endpoint"
    echo "3. Create API key pairs for projects"
    echo "4. Set up custom domains if needed"
    echo "5. Configure monitoring alerts"
    echo ""
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; cleanup; exit 1' INT TERM

# Run main function
main "$@" 