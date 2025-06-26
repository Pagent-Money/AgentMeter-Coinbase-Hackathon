#!/bin/bash

# Simple AgentMeter Google Cloud Run Deployment Script
# Usage: ./deploy-simple.sh [environment] [region] [project_id]
# Example: ./deploy-simple.sh production us-central1 my-project-id

set -e

# Default values
ENVIRONMENT=${1:-staging}
REGION=${2:-us-central1}
PROJECT_ID=${3:-${GOOGLE_CLOUD_PROJECT:-""}}

# Application configuration
APP_NAME="agentmeter"
SERVICE_NAME="${APP_NAME}-service"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# Print banner
echo ""
echo "╔══════════════════════════════════════╗"
echo "║     Simple AgentMeter Deployment     ║"
echo "║          Google Cloud Run           ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Region:      $REGION"
echo "Project:     $PROJECT_ID"
echo "=============================================="

# Basic checks
log_info "Checking basic requirements..."

if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install it first."
    exit 1
fi

# Validate project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -z "$PROJECT_ID" ]; then
        log_error "Google Cloud project ID not set. Please provide it as an argument or set it with 'gcloud config set project PROJECT_ID'"
        exit 1
    fi
fi

# Set project
log_info "Setting Google Cloud project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Check if required APIs are enabled (without trying to enable them)
log_info "Checking if required APIs are enabled..."
REQUIRED_APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "containerregistry.googleapis.com"
)

MISSING_APIS=()
for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        log_success "✓ $api is enabled"
    else
        log_warning "✗ $api is not enabled"
        MISSING_APIS+=($api)
    fi
done

if [ ${#MISSING_APIS[@]} -ne 0 ]; then
    log_warning "Some required APIs are not enabled. Please enable them manually:"
    for api in "${MISSING_APIS[@]}"; do
        echo "  gcloud services enable $api --project=$PROJECT_ID"
    done
    echo ""
    read -p "Would you like to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled. Please enable the required APIs first."
        exit 1
    fi
fi

# Build using Cloud Build instead of local Docker
log_info "Building service using Google Cloud Build..."

# Get current git information
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log_info "Commit SHA: $COMMIT_SHA"
log_info "Build time: $BUILD_TIME"

# Create a simple cloudbuild.yaml for the service
log_info "Creating Cloud Build configuration..."
cat > cloudbuild-simple.yaml << 'EOF'
steps:
  # Build service
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['install']
    
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build:service']

  # Build and push service container
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/agentmeter-service:${_ENVIRONMENT}-${BUILD_ID}'
      - '-f'
      - 'deployment/dockerfiles/Dockerfile.service'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/agentmeter-service:${_ENVIRONMENT}-${BUILD_ID}'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'agentmeter-service'
      - '--image'
      - 'gcr.io/$PROJECT_ID/agentmeter-service:${_ENVIRONMENT}-${BUILD_ID}'
      - '--region'
      - '${_REGION}'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '8080'
      - '--memory'
      - '512Mi'
      - '--cpu'
      - '1'
      - '--max-instances'
      - '10'
      - '--timeout'
      - '300s'
      - '--set-env-vars'
      - 'NODE_ENV=production,PORT=8080,ENVIRONMENT=${_ENVIRONMENT}'

substitutions:
  _REGION: '$REGION'
  _ENVIRONMENT: '$ENVIRONMENT'

options:
  machineType: 'E2_HIGHCPU_4'
  logging: CLOUD_LOGGING_ONLY

images:
  - 'gcr.io/$PROJECT_ID/agentmeter-service:${_ENVIRONMENT}-${BUILD_ID}'

timeout: '600s'
EOF

# Submit build to Cloud Build
log_info "Submitting build to Google Cloud Build..."
gcloud builds submit \
    --config=cloudbuild-simple.yaml \
    --substitutions=_REGION=$REGION,_ENVIRONMENT=$ENVIRONMENT \
    --project=$PROJECT_ID

if [ $? -ne 0 ]; then
    log_error "Cloud Build failed"
    exit 1
fi

log_success "Cloud Build completed successfully"

# Note: Deployment to Cloud Run is handled by Cloud Build above

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --format 'value(status.url)')

log_success "Deployment completed successfully!"
echo ""
echo "╔══════════════════════════════════════╗"
echo "║           Deployment Summary         ║"
echo "╚══════════════════════════════════════╝"
echo "Service Name: $SERVICE_NAME"
echo "Environment:  $ENVIRONMENT"
echo "Region:       $REGION"
echo "Image:        $IMAGE_URL"
echo "Service URL:  $SERVICE_URL"
echo ""
echo "Health Check: $SERVICE_URL/health"
echo ""
log_info "Testing service health..."
if curl -s -f "$SERVICE_URL/health" > /dev/null; then
    log_success "Service is healthy and responding!"
else
    log_warning "Service may still be starting up. Please check the Cloud Run logs if issues persist."
fi

# Clean up
log_info "Cleaning up..."
rm -f cloudbuild-simple.yaml
log_success "Cleanup completed"

echo ""
log_success "Deployment process completed!" 