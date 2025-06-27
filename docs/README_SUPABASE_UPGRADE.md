# AgentMeter Supabase Upgrade

## Overview

This upgrade migrates AgentMeter from MongoDB to Supabase (PostgreSQL) for better performance, built-in authentication, real-time capabilities, and easier scaling.

## 🚀 What's Changed

### Environment Configuration
- **Server Environment**: `/server/.env` - Contains Supabase configuration for server-side rendering
- **Service Environment**: `/service/.env` - Contains all secrets and credentials for API services

### Database Migration
- **From**: MongoDB with custom collections
- **To**: Supabase (PostgreSQL) with structured tables, indexes, and RLS policies

### Dependencies
- **Added**: `@supabase/supabase-js@2.39.3`
- **Removed**: `mongodb@6.17.0`, `mongoose@6.5.1`

## 📋 Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Note down your project credentials:
   - Project URL: `https://your-project-id.supabase.co`
   - Anon Key: `your-anon-key`
   - Service Role Key: `your-service-role-key`

### 2. Set Up Database Schema

Run the SQL schema in the Supabase SQL editor:

```bash
# Copy the schema from database/supabase-schema.sql
# and run it in Supabase Dashboard > SQL Editor
```

### 3. Configure Environment Variables

#### Server Environment (`/server/.env`)
```bash
# Supabase Database Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_PROJECT_ID=your-project-id

# Environment
NODE_ENV=development
SERVER_PORT=9090

# Security
CORS_ORIGIN=http://localhost:3000
SESSION_SECRET=your-session-secret-key-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Service Environment (`/service/.env`)
```bash
# Supabase Database Configuration  
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORGANIZATION=org-your-organization-id-here
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3

# X402 Payment Configuration
X402_PAY_TO_ADDRESS=0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_NETWORK=base-sepolia

# Service Configuration
SERVICE_PORT=4021
NODE_ENV=development

# API Keys & Secrets
JWT_SECRET=your-jwt-secret-for-authentication
API_SECRET_KEY=your-api-secret-key-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:9090
CORS_CREDENTIALS=true

# Pricing Configuration (defaults)
DEFAULT_REQUEST_PRICE=0.001
DEFAULT_INPUT_TOKEN_PRICE=0.002
DEFAULT_OUTPUT_TOKEN_PRICE=0.004

# External Services (optional)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret-here

# Email Service (optional)
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
FROM_EMAIL=noreply@agentmeter.com
```

### 4. Install Dependencies

```bash
npm install @supabase/supabase-js@2.39.3
npm uninstall mongodb mongoose
```

### 5. Run the Application

```bash
# Build and start the service
npm run service

# Or for development
npm run service:dev
```

## 🗃️ Database Schema

### Tables

#### Projects
- Stores project configuration and API keys
- Settings include pricing for requests and tokens
- Unique secret keys for authentication

#### Metering Events  
- Records all API usage and token consumption
- Supports both request-based and token-based metering
- Calculated costs with automatic total computation
- Metadata field for additional context

#### Billing Records
- Periodic billing summaries (weekly/monthly)
- Aggregated usage statistics
- Invoice tracking and payment status

### Key Features

- **Row Level Security (RLS)** for data isolation
- **Automatic timestamps** with triggers
- **Performance indexes** for fast queries
- **Database functions** for analytics
- **Data validation** with constraints
- **Analytics view** for reporting

## 🔧 API Changes

### New Features

1. **Enhanced Error Handling**: Better error messages from Supabase
2. **Improved Pagination**: Offset/limit support with totals
3. **Real-time Capabilities**: Ready for live dashboard updates
4. **Better Filtering**: Support for multiple filter combinations
5. **Environment-based Configuration**: All secrets externalized

### Updated Endpoints

All existing endpoints maintain backward compatibility but now use Supabase:

- `POST /api/project/create` - Create new projects
- `GET /api/project/load` - Load project by ID
- `GET /api/projects` - List all projects
- `PUT /api/project/:id` - Update project
- `DELETE /api/project/:id` - Delete project
- `POST /api/meter/event` - Record metering events
- `GET /api/meter/events` - Query metering events
- `GET /health` - Health check with Supabase status

## 🔐 Security Improvements

1. **Environment Variables**: All credentials externalized
2. **Row Level Security**: Database-level access controls
3. **Service Role**: Secure server-side operations
4. **Input Validation**: Enhanced data validation
5. **CORS Configuration**: Configurable cross-origin settings

## 📊 Benefits of Supabase

1. **PostgreSQL Power**: ACID compliance, complex queries, JSON support
2. **Built-in Authentication**: Ready-to-use user management
3. **Real-time Subscriptions**: Live updates for dashboards
4. **Auto-generated APIs**: REST and GraphQL endpoints
5. **Database UI**: Built-in table editor and SQL runner
6. **Edge Functions**: Serverless function deployment
7. **Better Scaling**: Managed infrastructure with auto-scaling
8. **Backup & Recovery**: Automated backups and point-in-time recovery

## 🧪 Testing

### Health Check
```bash
curl http://localhost:4021/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "supabase": "connected",
  "environment": "development"
}
```

### Create Project
```bash
curl -X POST http://localhost:4021/api/project/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "A test project for AgentMeter"
  }'
```

### Record Metering Event
```bash
curl -X POST http://localhost:4021/api/meter/event \
  -H "Content-Type: application/json" \
  -H "x-project-secret: your-project-secret-key" \
  -d '{
    "project_id": "proj_12345678",
    "agent_id": "test-agent",
    "user_id": "user123",
    "tokens_in": 100,
    "tokens_out": 50,
    "api_calls": 1
  }'
```

## 🛠️ Troubleshooting

### Connection Issues
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- Verify project exists in Supabase dashboard
- Ensure RLS policies allow service role access

### Permission Errors
- Confirm service role key is used (not anon key)
- Check RLS policies in Supabase dashboard
- Verify table permissions for service role

### Migration from MongoDB
- Export existing MongoDB data
- Transform to match new schema structure  
- Import using Supabase CSV import or SQL INSERT

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

## 🎯 Next Steps

1. **Real-time Dashboard**: Implement live updates using Supabase subscriptions
2. **User Authentication**: Add proper user management with Supabase Auth
3. **Data Analytics**: Create advanced reporting with PostgreSQL functions
4. **Performance Optimization**: Fine-tune indexes and queries
5. **Monitoring**: Set up alerts and monitoring for production use 