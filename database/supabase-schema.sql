-- AgentMeter Supabase Database Schema
-- Run this script in the Supabase SQL editor to set up the database

-- Create commercial accounts table
CREATE TABLE IF NOT EXISTS commercial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT, -- For email/password auth, nullable for OAuth-only accounts
  full_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'oauth')),
  oauth_provider_id TEXT, -- For Google OAuth or other providers
  metadata JSONB DEFAULT '{}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create API key pairs table
CREATE TABLE IF NOT EXISTS api_key_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL, -- Will reference projects(id) after projects table is created
  account_id UUID NOT NULL REFERENCES commercial_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- User-friendly name for the key pair
  api_key TEXT NOT NULL UNIQUE, -- Public API key (starts with pk_)
  secret_key TEXT NOT NULL UNIQUE, -- Secret key (starts with sk_)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  permissions JSONB DEFAULT '{"read": true, "write": true, "admin": false}',
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES commercial_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'suspended')),
  secret_key TEXT NOT NULL UNIQUE, -- Legacy compatibility, will deprecate in favor of api_key_pairs
  settings JSONB DEFAULT '{
    "requestPricing": 0.001,
    "inputTokenPricing": 0.002,
    "outputTokenPricing": 0.004
  }',
  billing_enabled BOOLEAN DEFAULT TRUE,
  created_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create metering events table
CREATE TABLE IF NOT EXISTS metering_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('api_request', 'token_usage')),
  request_count INTEGER DEFAULT 0 CHECK (request_count >= 0),
  input_tokens INTEGER DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER DEFAULT 0 CHECK (output_tokens >= 0),
  request_cost DECIMAL(10,6) DEFAULT 0 CHECK (request_cost >= 0),
  input_token_cost DECIMAL(10,6) DEFAULT 0 CHECK (input_token_cost >= 0),
  output_token_cost DECIMAL(10,6) DEFAULT 0 CHECK (output_token_cost >= 0),
  total_cost DECIMAL(10,6) GENERATED ALWAYS AS (request_cost + input_token_cost + output_token_cost) STORED,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for api_key_pairs now that projects table exists
ALTER TABLE api_key_pairs ADD CONSTRAINT fk_api_key_pairs_project_id 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Create user meters table
CREATE TABLE IF NOT EXISTS user_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  threshold_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (threshold_amount >= 0),
  current_usage DECIMAL(10,2) DEFAULT 0 CHECK (current_usage >= 0),
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create billing records table
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_requests INTEGER DEFAULT 0 CHECK (total_requests >= 0),
  total_input_tokens BIGINT DEFAULT 0 CHECK (total_input_tokens >= 0),
  total_output_tokens BIGINT DEFAULT 0 CHECK (total_output_tokens >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_metering_events_project_id ON metering_events(project_id);
CREATE INDEX IF NOT EXISTS idx_metering_events_timestamp ON metering_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metering_events_agent_id ON metering_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_metering_events_user_id ON metering_events(user_id);
CREATE INDEX IF NOT EXISTS idx_metering_events_event_type ON metering_events(event_type);
CREATE INDEX IF NOT EXISTS idx_metering_events_composite ON metering_events(project_id, timestamp DESC, agent_id);

CREATE INDEX IF NOT EXISTS idx_billing_records_project_id ON billing_records(project_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_period ON billing_records(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects(account_id);

-- Indexes for commercial accounts
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_email ON commercial_accounts(email);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_status ON commercial_accounts(status);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_auth_provider ON commercial_accounts(auth_provider);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_oauth_provider_id ON commercial_accounts(oauth_provider_id);

-- Indexes for API key pairs
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_project_id ON api_key_pairs(project_id);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_account_id ON api_key_pairs(account_id);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_api_key ON api_key_pairs(api_key);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_secret_key ON api_key_pairs(secret_key);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_status ON api_key_pairs(status);

-- Indexes for user meters
CREATE INDEX IF NOT EXISTS idx_user_meters_project_id ON user_meters(project_id);
CREATE INDEX IF NOT EXISTS idx_user_meters_user_id ON user_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_meters_composite ON user_meters(project_id, user_id);

-- Create update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_records_updated_at 
    BEFORE UPDATE ON billing_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commercial_accounts_updated_at 
    BEFORE UPDATE ON commercial_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_key_pairs_updated_at 
    BEFORE UPDATE ON api_key_pairs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_meters_updated_at 
    BEFORE UPDATE ON user_meters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for metering stats
CREATE OR REPLACE FUNCTION get_metering_stats(
    p_project_id TEXT,
    p_timeframe TEXT DEFAULT '30 days'
)
RETURNS TABLE(
    total_requests BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cost DECIMAL(10,2),
    avg_cost_per_request DECIMAL(10,6),
    unique_agents BIGINT,
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(request_count), 0)::BIGINT as total_requests,
        COALESCE(SUM(input_tokens), 0)::BIGINT as total_input_tokens,
        COALESCE(SUM(output_tokens), 0)::BIGINT as total_output_tokens,
        COALESCE(SUM(total_cost), 0)::DECIMAL(10,2) as total_cost,
        CASE 
            WHEN SUM(request_count) > 0 THEN 
                (COALESCE(SUM(total_cost), 0) / SUM(request_count))::DECIMAL(10,6)
            ELSE 0::DECIMAL(10,6)
        END as avg_cost_per_request,
        COUNT(DISTINCT agent_id)::BIGINT as unique_agents,
        COUNT(DISTINCT user_id)::BIGINT as unique_users
    FROM metering_events 
    WHERE project_id = p_project_id 
        AND timestamp >= NOW() - p_timeframe::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to generate API key pairs
CREATE OR REPLACE FUNCTION generate_api_key_pair(
    p_account_id UUID,
    p_project_id TEXT,
    p_name TEXT,
    p_permissions JSONB DEFAULT '{"read": true, "write": true, "admin": false}'
)
RETURNS TABLE(
    api_key TEXT,
    secret_key TEXT,
    key_id UUID
) AS $$
DECLARE
    v_api_key TEXT;
    v_secret_key TEXT;
    v_key_id UUID;
BEGIN
    -- Generate API key (public key starting with pk_)
    v_api_key := 'pk_' || encode(gen_random_bytes(16), 'hex');
    
    -- Generate secret key (starting with sk_)
    v_secret_key := 'sk_' || encode(gen_random_bytes(32), 'hex');
    
    -- Insert the key pair
    INSERT INTO api_key_pairs (
        project_id, account_id, name, api_key, secret_key, permissions
    ) VALUES (
        p_project_id, p_account_id, p_name, v_api_key, v_secret_key, p_permissions
    ) RETURNING id INTO v_key_id;
    
    RETURN QUERY SELECT v_api_key, v_secret_key, v_key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to authenticate API key
CREATE OR REPLACE FUNCTION authenticate_api_key(
    p_api_key TEXT
)
RETURNS TABLE(
    project_id TEXT,
    account_id UUID,
    permissions JSONB,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        akp.project_id,
        akp.account_id,
        akp.permissions,
        (akp.status = 'active' AND 
         p.status = 'active' AND 
         ca.status = 'active' AND
         (akp.expires_at IS NULL OR akp.expires_at > NOW())) as is_valid
    FROM api_key_pairs akp
    JOIN projects p ON akp.project_id = p.id
    JOIN commercial_accounts ca ON akp.account_id = ca.id
    WHERE akp.api_key = p_api_key;
    
    -- Update last_used_at if key exists and is valid
    UPDATE api_key_pairs 
    SET last_used_at = NOW() 
    WHERE api_key = p_api_key AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to get or create user meter
CREATE OR REPLACE FUNCTION get_or_create_user_meter(
    p_project_id TEXT,
    p_user_id TEXT,
    p_threshold_amount DECIMAL(10,2) DEFAULT 100.00
)
RETURNS TABLE(
    project_id TEXT,
    user_id TEXT,
    threshold_amount DECIMAL(10,2),
    current_usage DECIMAL(10,2),
    last_reset_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Try to get existing meter
    RETURN QUERY
    SELECT um.project_id, um.user_id, um.threshold_amount, 
           um.current_usage, um.last_reset_at, um.updated_at
    FROM user_meters um 
    WHERE um.project_id = p_project_id AND um.user_id = p_user_id;
    
    -- If no meter exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_meters (project_id, user_id, threshold_amount)
        VALUES (p_project_id, p_user_id, p_threshold_amount);
        
        RETURN QUERY
        SELECT um.project_id, um.user_id, um.threshold_amount, 
               um.current_usage, um.last_reset_at, um.updated_at
        FROM user_meters um 
        WHERE um.project_id = p_project_id AND um.user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE commercial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE metering_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_meters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust these based on your authentication needs)
-- For now, we'll allow service role to access everything

-- Projects policies
CREATE POLICY "Service role can manage all projects" ON projects
    FOR ALL USING (auth.role() = 'service_role');

-- Metering events policies  
CREATE POLICY "Service role can manage all metering events" ON metering_events
    FOR ALL USING (auth.role() = 'service_role');

-- Billing records policies
CREATE POLICY "Service role can manage all billing records" ON billing_records
    FOR ALL USING (auth.role() = 'service_role');

-- Commercial accounts policies
CREATE POLICY "Service role can manage all commercial accounts" ON commercial_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- API key pairs policies
CREATE POLICY "Service role can manage all API key pairs" ON api_key_pairs
    FOR ALL USING (auth.role() = 'service_role');

-- User meters policies
CREATE POLICY "Service role can manage all user meters" ON user_meters
    FOR ALL USING (auth.role() = 'service_role');

-- Insert some sample data (optional)
-- INSERT INTO projects (id, name, description, secret_key) VALUES 
-- ('proj_sample01', 'Sample Project', 'A sample project for testing', 'sk_live_sample_key_123456789'),
-- ('proj_sample02', 'Demo Project', 'Demo project for AgentMeter', 'sk_live_demo_key_987654321');

-- Create a view for project analytics
CREATE OR REPLACE VIEW project_analytics AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.account_id,
    ca.email as account_email,
    ca.full_name as account_name,
    ca.company_name,
    ca.subscription_tier,
    p.created_date,
    COUNT(me.id) as total_events,
    COALESCE(SUM(me.request_count), 0) as total_requests,
    COALESCE(SUM(me.input_tokens), 0) as total_input_tokens,
    COALESCE(SUM(me.output_tokens), 0) as total_output_tokens,
    COALESCE(SUM(me.total_cost), 0) as total_revenue,
    COUNT(DISTINCT me.agent_id) as unique_agents,
    COUNT(DISTINCT me.user_id) as unique_users,
    MAX(me.timestamp) as last_activity,
    COUNT(akp.id) as total_api_keys
FROM projects p
LEFT JOIN commercial_accounts ca ON p.account_id = ca.id
LEFT JOIN metering_events me ON p.id = me.project_id
LEFT JOIN api_key_pairs akp ON p.id = akp.project_id AND akp.status = 'active'
GROUP BY p.id, p.name, p.status, p.account_id, ca.email, ca.full_name, ca.company_name, ca.subscription_tier, p.created_date;

-- Grant access to the service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role; 