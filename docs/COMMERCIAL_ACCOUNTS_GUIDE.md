# Commercial Account System Implementation Guide

## Overview

AgentMeter has been upgraded with a comprehensive commercial account system that provides proper project ownership, API key management, and enhanced security. This guide explains the new architecture and how to use it.

## 🏗️ Architecture Changes

### 1. Commercial Accounts Table
- **Primary user system** for the AgentMeter platform
- Supports email/password and OAuth (Google) authentication
- Includes subscription tiers (free, starter, professional, enterprise)
- Account status management (active, suspended, inactive)

### 2. Project Ownership Model
- Projects now **belong to commercial accounts** via `account_id` foreign key
- Account owners can create and manage multiple projects
- Proper access control and project isolation

### 3. API Key Pairs System
- **Modern API key authentication** with `pk_` (public) and `sk_` (secret) prefixes
- **One-to-many relationship**: Each project can have multiple API key pairs
- **One-to-one constraint**: Each key pair belongs to only one project
- Granular permissions (read, write, admin)
- Key expiration and revocation capabilities

### 4. Enhanced Security
- Row Level Security (RLS) enabled on all tables
- Proper privilege separation
- Rate limiting based on subscription tiers
- Account-based access control

## 🚀 API Endpoints

### Commercial Account Management

#### Register Account
```http
POST /api/accounts/register
Content-Type: application/json

{
  "email": "user@company.com",
  "full_name": "John Doe",
  "company_name": "Acme Corp",
  "phone": "+1234567890"
}
```

#### Get Account Profile
```http
GET /api/accounts/profile
Authorization: Bearer <api_key_or_secret_key>
```

### Project Management

#### Create Project
```http
POST /api/projects
Authorization: Bearer <api_key_or_secret_key>
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "settings": {
    "requestPricing": 0.001,
    "inputTokenPricing": 0.002,
    "outputTokenPricing": 0.004
  }
}
```

#### Get Projects
```http
GET /api/projects
Authorization: Bearer <api_key_or_secret_key>
```

#### Get Specific Project
```http
GET /api/projects/{projectId}
Authorization: Bearer <api_key_or_secret_key>
```

#### Update Project
```http
PUT /api/projects/{projectId}
Authorization: Bearer <api_key_or_secret_key>
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description",
  "billing_enabled": true
}
```

#### Delete Project
```http
DELETE /api/projects/{projectId}
Authorization: Bearer <api_key_or_secret_key>
```

### API Key Management

#### Create API Key Pair
```http
POST /api/projects/{projectId}/api-keys
Authorization: Bearer <api_key_or_secret_key>
Content-Type: application/json

{
  "name": "Frontend App Key",
  "permissions": {
    "read": true,
    "write": true,
    "admin": false
  }
}
```

#### List API Keys
```http
GET /api/projects/{projectId}/api-keys
Authorization: Bearer <api_key_or_secret_key>
```

#### Revoke API Key
```http
DELETE /api/api-keys/{keyId}
Authorization: Bearer <api_key_or_secret_key>
```

## 🔐 Authentication Methods

### 1. API Key Authentication (Recommended)
```http
Authorization: Bearer pk_1234567890abcdef1234567890abcdef
```
or
```http
Authorization: Bearer sk_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### 2. Legacy Secret Key (Backward Compatibility)
```http
Authorization: Bearer sk_live_legacy_key_here
X-Project-ID: proj_12345678
```

## 🏷️ Subscription Tiers & Rate Limits

| Tier | Rate Limit (per minute) | Features |
|------|------------------------|----------|
| Free | 50 requests | Basic metering, 1 project |
| Starter | 100 requests | Multiple projects, API keys |
| Professional | 500 requests | Advanced analytics, team access |
| Enterprise | 1000 requests | Custom limits, priority support |

## 📊 Migration from Legacy System

### Automatic Migration
The database migration script automatically:
1. Creates a default admin account (`admin@agentmeter.local`)
2. Assigns all existing projects to this default account
3. Maintains backward compatibility with existing secret keys

### Manual Migration Steps
1. **Run the migration script** in Supabase SQL editor:
   ```sql
   -- Use database/supabase-migration.sql
   ```

2. **Update your applications** to use new API endpoints:
   ```javascript
   // Old
   POST /api/project/create
   
   // New
   POST /api/projects
   ```

3. **Generate new API key pairs** for enhanced security:
   ```javascript
   const response = await fetch('/api/projects/proj_123/api-keys', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer sk_legacy_key',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       name: 'Production Key',
       permissions: { read: true, write: true, admin: false }
     })
   })
   ```

## 🧪 Testing

### Run Commercial Account Tests
```bash
# Start service and run tests
npm run test:commercial:with-server

# Or test against running service
npm run test:commercial
```

### Manual Testing Steps
1. **Register a commercial account**
2. **Authenticate with API key**
3. **Create and manage projects**
4. **Generate and use API key pairs**
5. **Test rate limiting based on subscription tier**

## 🔧 Configuration

### Environment Variables
```bash
# Database (required)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15000
RATE_LIMIT_MAX_REQUESTS=100

# Pricing
DEFAULT_REQUEST_PRICE=0.001
DEFAULT_INPUT_TOKEN_PRICE=0.002
DEFAULT_OUTPUT_TOKEN_PRICE=0.004

# CORS
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
CORS_CREDENTIALS=true
```

## 🚨 Security Considerations

### API Key Security
- **Never expose secret keys** in client-side code
- **Use public keys** (`pk_`) for client-side applications
- **Use secret keys** (`sk_`) for server-side applications
- **Rotate keys regularly** and revoke unused keys

### Access Control
- Projects are isolated by account ownership
- API keys are scoped to specific projects
- Permissions are granular (read, write, admin)
- Rate limiting prevents abuse

### Backward Compatibility
- Legacy secret keys continue to work
- Old endpoints redirect to new ones
- Gradual migration path provided

## 📝 Development Workflow

### For New Applications
1. Register a commercial account
2. Create a project
3. Generate API key pairs for different environments
4. Use public keys for frontend, secret keys for backend
5. Monitor usage through the dashboard

### For Existing Applications
1. Continue using legacy endpoints during transition
2. Gradually migrate to new project management endpoints
3. Generate new API key pairs
4. Update authentication to use new keys
5. Deprecate legacy secret keys

## 🔍 Troubleshooting

### Common Issues

#### Authentication Errors
- **401 Unauthorized**: Check API key format and validity
- **403 Forbidden**: Verify project ownership and permissions
- **429 Rate Limited**: Check subscription tier limits

#### Project Access Issues
- Ensure API key belongs to correct account
- Verify project ownership
- Check account status (active vs suspended)

#### Migration Issues
- Run migration script in correct order
- Verify foreign key constraints
- Check RLS policies are properly applied

## 📚 Additional Resources

- [API Documentation](./API.md)
- [Database Schema](./database/supabase-schema.sql)
- [Migration Guide](./database/supabase-migration.sql)
- [Testing Guide](./TESTING_SUMMARY.md) 