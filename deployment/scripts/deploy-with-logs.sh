 #!/bin/bash

# AgentMeter Google Cloud Run Deployment Script with Real-time Logs
# Usage: ./deploy-with-logs.sh [environment] [region]
# Example: ./deploy-with-logs.sh production us-central1

set -e

# Default values
ENVIRONMENT=${1:-staging}
REGION=${2:-us-central1}
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check requirements
check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
        if [ -z "$PROJECT_ID" ]; then
            log_error "Google Cloud project ID not set. Set GOOGLE_CLOUD_PROJECT environment variable or run 'gcloud config set project PROJECT_ID'"
            exit 1
        fi
    fi
    
    log_success "Requirements check passed"
}

# Enable required APIs
enable_apis() {
    log_info "Enabling required Google Cloud APIs..."
    
    gcloud services enable cloudbuild.googleapis.com \
        run.googleapis.com \
        containerregistry.googleapis.com \
        secretmanager.googleapis.com \
        --project=$PROJECT_ID
    
    log_success "APIs enabled"
}

# Create secrets in Secret Manager
create_secrets() {
    log_info "Checking and creating secrets..."
    
    # Check if secrets exist, create them if they don't
    secrets=("supabase-url" "supabase-anon-key" "supabase-service-key" "openai-api-key")
    
    for secret in "${secrets[@]}"; do
        if ! gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
            log_warning "Secret $secret does not exist. Creating placeholder..."
            echo "CHANGE_ME_${secret^^}" | gcloud secrets create $secret --data-file=- --project=$PROJECT_ID
            log_info "Please update secret $secret with actual value using: gcloud secrets versions add $secret --data-file=path/to/secret"
        else
            log_info "Secret $secret already exists"
        fi
    done
}

# Build and deploy with real-time logs
deploy() {
    log_info "Starting deployment to $ENVIRONMENT environment in $REGION region..."
    
    # Get current git commit SHA
    COMMIT_SHA=$(git rev-parse --short HEAD)
    
    # Submit build to Cloud Build
    log_info "Submitting build to Cloud Build..."
    BUILD_ID=$(gcloud builds submit \
        --config=cloudbuild.yaml \
        --substitutions=_REGION=$REGION \
        --project=$PROJECT_ID \
        --format="value(id)" \
        --quiet)
    
    log_info "Build ID: $BUILD_ID"
    log_info "Following build logs in real-time..."
    echo ""
    
    # Follow build logs in real-time
    gcloud builds log $BUILD_ID --project=$PROJECT_ID --stream
    
    # Check build status
    BUILD_STATUS=$(gcloud builds describe $BUILD_ID --project=$PROJECT_ID --format="value(status)")
    
    if [ "$BUILD_STATUS" = "SUCCESS" ]; then
        log_success "Build and deployment completed successfully!"
    else
        log_error "Build failed with status: $BUILD_STATUS"
        log_info "View detailed logs at: https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=$PROJECT_ID"
        exit 1
    fi
}

# Get service URLs
get_service_urls() {
    log_info "Getting service URLs..."
    
    SERVICE_URL=$(gcloud run services describe agentmeter-service --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    FRONTEND_URL=$(gcloud run services describe agentmeter-frontend --region=$REGION --project=$PROJECT_ID --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    
    echo ""
    log_success "Deployment URLs:"
    echo "Service API:  $SERVICE_URL"
    echo "Frontend:     $FRONTEND_URL"
    echo ""
}

# Main deployment process
main() {
    echo "=========================================="
    echo "AgentMeter Cloud Run Deployment (with Logs)"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Region:      $REGION"
    echo "Project:     $PROJECT_ID"
    echo "=========================================="
    
    check_requirements
    enable_apis
    create_secrets
    deploy
    get_service_urls
    
    log_success "Deployment process completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update secrets with actual values"
    echo "2. Test the deployed services"
    echo "3. Set up monitoring and alerting"
    echo ""
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main \"$@\"