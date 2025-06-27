#!/bin/bash

# AgentMeter Deployment Maintenance Script
# Usage: ./maintenance.sh [command] [options]
# Commands: status, logs, scale, rollback, secrets, cleanup

set -e

# Configuration
REGION=${REGION:-us-central1}
PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
SERVICE_NAME="agentmeter-service"
FRONTEND_NAME="agentmeter-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }

# Print usage
usage() {
    echo "AgentMeter Deployment Maintenance Script"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status                     Show deployment status"
    echo "  logs [service|frontend]    View service logs"
    echo "  scale <service> <min> <max> Scale service instances"
    echo "  rollback <service>         Rollback to previous revision"
    echo "  secrets                    List and manage secrets"
    echo "  cleanup                    Clean up old revisions"
    echo "  health                     Run health checks"
    echo "  traffic <service> <revision> <percent> Manage traffic allocation"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs service"
    echo "  $0 scale agentmeter-service 1 10"
    echo "  $0 rollback agentmeter-service"
    echo "  $0 traffic agentmeter-service abc123 50"
    echo ""
}

# Check deployment status
check_status() {
    log_step "Checking deployment status..."
    
    echo ""
    echo "=== Service Status ==="
    if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
        SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(status.url)")
        SERVICE_STATUS=$(gcloud run services describe $SERVICE_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(status.conditions[0].status)")
        
        echo "✅ Service: $SERVICE_NAME"
        echo "   URL: $SERVICE_URL"
        echo "   Status: $SERVICE_STATUS"
        
        # Get resource allocation
        MEMORY=$(gcloud run services describe $SERVICE_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(spec.template.spec.template.spec.containers[0].resources.limits.memory)")
        CPU=$(gcloud run services describe $SERVICE_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(spec.template.spec.template.spec.containers[0].resources.limits.cpu)")
        
        echo "   Memory: $MEMORY"
        echo "   CPU: $CPU"
    else
        echo "❌ Service: $SERVICE_NAME (Not deployed)"
    fi
    
    echo ""
    echo "=== Frontend Status ==="
    if gcloud run services describe $FRONTEND_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
        FRONTEND_URL=$(gcloud run services describe $FRONTEND_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(status.url)")
        FRONTEND_STATUS=$(gcloud run services describe $FRONTEND_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(status.conditions[0].status)")
        
        echo "✅ Frontend: $FRONTEND_NAME"
        echo "   URL: $FRONTEND_URL"
        echo "   Status: $FRONTEND_STATUS"
    else
        echo "❌ Frontend: $FRONTEND_NAME (Not deployed)"
    fi
    
    echo ""
    echo "=== Recent Revisions ==="
    gcloud run revisions list \
        --service=$SERVICE_NAME \
        --region=$REGION \
        --project=$PROJECT_ID \
        --limit=5 \
        --format="table(metadata.name,status.conditions[0].status,spec.template.metadata.creationTimestamp)"
}

# View logs
view_logs() {
    local service_type=${1:-service}
    local lines=${2:-50}
    
    case $service_type in
        service|s)
            log_step "Viewing service logs (last $lines lines)..."
            gcloud run services logs read $SERVICE_NAME \
                --region=$REGION \
                --project=$PROJECT_ID \
                --limit=$lines
            ;;
        frontend|f)
            log_step "Viewing frontend logs (last $lines lines)..."
            gcloud run services logs read $FRONTEND_NAME \
                --region=$REGION \
                --project=$PROJECT_ID \
                --limit=$lines
            ;;
        *)
            log_error "Invalid service type. Use 'service' or 'frontend'"
            exit 1
            ;;
    esac
}

# Scale service
scale_service() {
    local service=$1
    local min_instances=$2
    local max_instances=$3
    
    if [ -z "$service" ] || [ -z "$min_instances" ] || [ -z "$max_instances" ]; then
        log_error "Usage: scale <service> <min_instances> <max_instances>"
        exit 1
    fi
    
    log_step "Scaling $service to min=$min_instances, max=$max_instances..."
    
    gcloud run services update $service \
        --region=$REGION \
        --project=$PROJECT_ID \
        --min-instances=$min_instances \
        --max-instances=$max_instances
    
    log_success "Service scaled successfully"
}

# Rollback service
rollback_service() {
    local service=$1
    
    if [ -z "$service" ]; then
        log_error "Usage: rollback <service>"
        exit 1
    fi
    
    log_step "Rolling back $service..."
    
    # Get previous revision
    PREVIOUS_REVISION=$(gcloud run revisions list \
        --service=$service \
        --region=$REGION \
        --project=$PROJECT_ID \
        --limit=2 \
        --format="value(metadata.name)" | sed -n '2p')
    
    if [ -z "$PREVIOUS_REVISION" ]; then
        log_error "No previous revision found"
        exit 1
    fi
    
    log_info "Rolling back to revision: $PREVIOUS_REVISION"
    
    gcloud run services update-traffic $service \
        --region=$REGION \
        --project=$PROJECT_ID \
        --to-revisions=$PREVIOUS_REVISION=100
    
    log_success "Rollback completed"
}

# Manage secrets
manage_secrets() {
    log_step "Managing secrets..."
    
    echo ""
    echo "=== Secret Status ==="
    
    secrets=("supabase-url" "supabase-anon-key" "supabase-service-key" "openai-api-key" "jwt-secret" "webhook-secret")
    
    for secret in "${secrets[@]}"; do
        if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
            VERSION=$(gcloud secrets versions list $secret \
                --project=$PROJECT_ID \
                --limit=1 \
                --format="value(name)")
            echo "✅ $secret (latest: $VERSION)"
        else
            echo "❌ $secret (not found)"
        fi
    done
    
    echo ""
    echo "Commands:"
    echo "  View secret: gcloud secrets versions access latest --secret=SECRET_NAME --project=$PROJECT_ID"
    echo "  Update secret: echo 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$PROJECT_ID"
}

# Cleanup old revisions
cleanup_revisions() {
    log_step "Cleaning up old revisions..."
    
    # Keep last 10 revisions for each service
    KEEP_COUNT=10
    
    for service in $SERVICE_NAME $FRONTEND_NAME; do
        log_info "Cleaning up revisions for $service..."
        
        # Get old revisions (skip the most recent ones)
        OLD_REVISIONS=$(gcloud run revisions list \
            --service=$service \
            --region=$REGION \
            --project=$PROJECT_ID \
            --format="value(metadata.name)" | tail -n +$((KEEP_COUNT + 1)))
        
        if [ -n "$OLD_REVISIONS" ]; then
            echo "$OLD_REVISIONS" | while read revision; do
                if [ -n "$revision" ]; then
                    log_info "Deleting revision: $revision"
                    gcloud run revisions delete $revision \
                        --region=$REGION \
                        --project=$PROJECT_ID \
                        --quiet
                fi
            done
        else
            log_info "No old revisions to clean up for $service"
        fi
    done
    
    log_success "Cleanup completed"
}

# Run health checks
run_health_checks() {
    log_step "Running health checks..."
    
    # Check service health
    if gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
        SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(status.url)")
        
        log_info "Testing service health endpoint..."
        if curl -f "$SERVICE_URL/health" &>/dev/null; then
            log_success "✅ Service health check passed"
        else
            log_error "❌ Service health check failed"
        fi
        
        # Test commercial account endpoint
        log_info "Testing commercial account endpoint..."
        response=$(curl -s -w "%{http_code}" -X POST "$SERVICE_URL/api/accounts/register" \
            -H "Content-Type: application/json" \
            -d '{"email":"healthcheck@example.com","full_name":"Health Check","company_name":"Test"}' \
            -o /dev/null)
        
        if [ "$response" = "200" ] || [ "$response" = "409" ]; then
            log_success "✅ Commercial account endpoint is responding"
        else
            log_warning "⚠️ Commercial account endpoint returned: $response"
        fi
    else
        log_error "❌ Service not deployed"
    fi
    
    # Check frontend health
    if gcloud run services describe $FRONTEND_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
        FRONTEND_URL=$(gcloud run services describe $FRONTEND_NAME \
            --region=$REGION --project=$PROJECT_ID \
            --format="value(status.url)")
        
        log_info "Testing frontend endpoint..."
        if curl -f "$FRONTEND_URL" &>/dev/null; then
            log_success "✅ Frontend health check passed"
        else
            log_error "❌ Frontend health check failed"
        fi
    else
        log_error "❌ Frontend not deployed"
    fi
}

# Manage traffic allocation
manage_traffic() {
    local service=$1
    local revision=$2
    local percent=$3
    
    if [ -z "$service" ] || [ -z "$revision" ] || [ -z "$percent" ]; then
        log_error "Usage: traffic <service> <revision> <percent>"
        exit 1
    fi
    
    log_step "Allocating $percent% traffic to $revision for $service..."
    
    gcloud run services update-traffic $service \
        --region=$REGION \
        --project=$PROJECT_ID \
        --to-revisions=$revision=$percent,LATEST=$((100-percent))
    
    log_success "Traffic allocation updated"
}

# Main command processing
main() {
    if [ $# -eq 0 ]; then
        usage
        exit 1
    fi
    
    command=$1
    shift
    
    case $command in
        status|s)
            check_status
            ;;
        logs|l)
            view_logs "$@"
            ;;
        scale)
            scale_service "$@"
            ;;
        rollback|rb)
            rollback_service "$@"
            ;;
        secrets)
            manage_secrets
            ;;
        cleanup|clean)
            cleanup_revisions
            ;;
        health|h)
            run_health_checks
            ;;
        traffic|t)
            manage_traffic "$@"
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            log_error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 