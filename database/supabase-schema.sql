-- AgentMeter Supabase Database Schema
-- Run this script in the Supabase SQL editor to set up the database

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
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

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE metering_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

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
    p.created_date,
    COUNT(me.id) as total_events,
    COALESCE(SUM(me.request_count), 0) as total_requests,
    COALESCE(SUM(me.input_tokens), 0) as total_input_tokens,
    COALESCE(SUM(me.output_tokens), 0) as total_output_tokens,
    COALESCE(SUM(me.total_cost), 0) as total_revenue,
    COUNT(DISTINCT me.agent_id) as unique_agents,
    COUNT(DISTINCT me.user_id) as unique_users,
    MAX(me.timestamp) as last_activity
FROM projects p
LEFT JOIN metering_events me ON p.id = me.project_id
GROUP BY p.id, p.name, p.status, p.created_date;

-- Grant access to the service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role; 