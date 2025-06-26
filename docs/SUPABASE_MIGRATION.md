# Supabase Migration Guide

## Overview
This guide outlines the migration from MongoDB to Supabase for the AgentMeter project.

## Environment Setup

### Server Configuration (`/server/.env`)
```bash
# Supabase Database Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_PROJECT_ID=your-project-id
```

### Service Configuration (`/service/.env`)
```bash
# Supabase Database Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
# ... other configurations
```

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Active',
  secret_key TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{
    "requestPricing": 0.001,
    "inputTokenPricing": 0.002,
    "outputTokenPricing": 0.004
  }',
  created_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Metering Events Table
```sql
CREATE TABLE metering_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT REFERENCES projects(id),
  agent_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL, -- 'api_request' or 'token_usage'
  request_count INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  request_cost DECIMAL(10,6) DEFAULT 0,
  input_token_cost DECIMAL(10,6) DEFAULT 0,
  output_token_cost DECIMAL(10,6) DEFAULT 0,
  total_cost DECIMAL(10,6) GENERATED ALWAYS AS (request_cost + input_token_cost + output_token_cost) STORED,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Billing Records Table
```sql
CREATE TABLE billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT REFERENCES projects(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes for Performance
```sql
-- Index for fast project lookups
CREATE INDEX idx_metering_events_project_id ON metering_events(project_id);
CREATE INDEX idx_metering_events_timestamp ON metering_events(timestamp);
CREATE INDEX idx_metering_events_agent_id ON metering_events(agent_id);
CREATE INDEX idx_metering_events_user_id ON metering_events(user_id);

-- Index for billing queries
CREATE INDEX idx_billing_records_project_id ON billing_records(project_id);
CREATE INDEX idx_billing_records_period ON billing_records(period_start, period_end);
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE metering_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- Project access policies (example)
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid()::text = created_by);

-- Metering events policies
CREATE POLICY "Service role can manage all metering events" ON metering_events
  FOR ALL USING (auth.role() = 'service_role');
```

## Migration Steps

1. **Create Supabase Project**
   - Sign up at https://supabase.com
   - Create a new project
   - Note down the project URL and API keys

2. **Set Environment Variables**
   - Fill in the actual values in `/server/.env` and `/service/.env`
   - Ensure SUPABASE_SERVICE_ROLE_KEY is used for server-side operations

3. **Run Database Schema**
   - Execute the SQL schemas above in the Supabase SQL editor
   - Set up RLS policies as needed

4. **Update Dependencies**
   ```bash
   npm install @supabase/supabase-js
   # Remove MongoDB dependency if not used elsewhere
   npm uninstall mongodb
   ```

5. **Test Migration**
   - Verify database connections
   - Test CRUD operations
   - Validate metering event logging

## Code Changes Required

The main code changes will be in `/service/index.js`:
- Replace MongoDB client with Supabase client
- Update all database operations to use Supabase syntax
- Implement proper error handling for Supabase operations

## Benefits of Supabase Migration

1. **Built-in Authentication**: Ready-to-use auth system
2. **Real-time Subscriptions**: Live updates for dashboard
3. **Automatic API Generation**: REST and GraphQL APIs
4. **Dashboard UI**: Built-in admin interface
5. **Edge Functions**: Serverless function deployment
6. **Better Scaling**: Managed PostgreSQL with auto-scaling
7. **Row Level Security**: Fine-grained access control 