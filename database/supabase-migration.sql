-- AgentMeter Database Migration Script
-- Run this script to migrate existing database to support commercial accounts
-- This script is safe to run multiple times (idempotent)

-- Step 1: Create new tables if they don't exist
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

-- Step 2: Create a default account for existing projects
DO $$
BEGIN
  -- Only create default account if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM commercial_accounts WHERE email = 'admin@agentmeter.local') THEN
    INSERT INTO commercial_accounts (
      email, full_name, company_name, status, subscription_tier
    ) VALUES (
      'admin@agentmeter.local', 'Default Admin', 'AgentMeter', 'active', 'enterprise'
    );
  END IF;
END $$;

-- Step 3: Add account_id column to projects if it doesn't exist
DO $$
BEGIN
  -- Check if account_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'account_id'
  ) THEN
    -- Add the column as nullable first
    ALTER TABLE projects ADD COLUMN account_id UUID;
    
    -- Update existing projects to use the default account
    UPDATE projects 
    SET account_id = (SELECT id FROM commercial_accounts WHERE email = 'admin@agentmeter.local' LIMIT 1)
    WHERE account_id IS NULL;
    
    -- Now make it NOT NULL and add the foreign key constraint
    ALTER TABLE projects ALTER COLUMN account_id SET NOT NULL;
    ALTER TABLE projects ADD CONSTRAINT fk_projects_account_id 
      FOREIGN KEY (account_id) REFERENCES commercial_accounts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 4: Update projects table columns safely
DO $$
BEGIN
  -- Update status column constraint if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status' 
    AND data_type = 'text'
  ) THEN
    -- First, normalize existing status values to match new constraint
    UPDATE projects SET status = 'active' WHERE status = 'Active';
    UPDATE projects SET status = 'archived' WHERE status = 'Inactive';
    UPDATE projects SET status = 'suspended' WHERE status = 'Suspended';
    -- Set any other values to 'active' as default
    UPDATE projects SET status = 'active' WHERE status NOT IN ('active', 'archived', 'suspended');
    
    -- Drop existing constraint if it exists
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
    -- Add new constraint
    ALTER TABLE projects ADD CONSTRAINT projects_status_check 
      CHECK (status IN ('active', 'archived', 'suspended'));
  END IF;
  
  -- Add billing_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'billing_enabled'
  ) THEN
    ALTER TABLE projects ADD COLUMN billing_enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Step 5: Create API key pairs table
CREATE TABLE IF NOT EXISTS api_key_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
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

-- Step 6: Add foreign key constraint for api_key_pairs to projects
DO $$
BEGIN
  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_api_key_pairs_project_id'
  ) THEN
    ALTER TABLE api_key_pairs ADD CONSTRAINT fk_api_key_pairs_project_id 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 7: Create user meters table
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

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_account_id ON projects(account_id);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_email ON commercial_accounts(email);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_status ON commercial_accounts(status);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_auth_provider ON commercial_accounts(auth_provider);
CREATE INDEX IF NOT EXISTS idx_commercial_accounts_oauth_provider_id ON commercial_accounts(oauth_provider_id);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_project_id ON api_key_pairs(project_id);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_account_id ON api_key_pairs(account_id);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_api_key ON api_key_pairs(api_key);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_secret_key ON api_key_pairs(secret_key);
CREATE INDEX IF NOT EXISTS idx_api_key_pairs_status ON api_key_pairs(status);
CREATE INDEX IF NOT EXISTS idx_user_meters_project_id ON user_meters(project_id);
CREATE INDEX IF NOT EXISTS idx_user_meters_user_id ON user_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_meters_composite ON user_meters(project_id, user_id);

-- Step 9: Enable RLS on new tables
ALTER TABLE commercial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_meters ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies
DO $$
BEGIN
  -- Commercial accounts policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'commercial_accounts' AND policyname = 'Service role can manage all commercial accounts'
  ) THEN
    CREATE POLICY "Service role can manage all commercial accounts" ON commercial_accounts
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- API key pairs policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'api_key_pairs' AND policyname = 'Service role can manage all API key pairs'
  ) THEN
    CREATE POLICY "Service role can manage all API key pairs" ON api_key_pairs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- User meters policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_meters' AND policyname = 'Service role can manage all user meters'
  ) THEN
    CREATE POLICY "Service role can manage all user meters" ON user_meters
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Step 11: Create update triggers
DO $$
BEGIN
  -- Create update function if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$ language 'plpgsql';
  END IF;

  -- Create triggers for new tables
  DROP TRIGGER IF EXISTS update_commercial_accounts_updated_at ON commercial_accounts;
  CREATE TRIGGER update_commercial_accounts_updated_at 
    BEFORE UPDATE ON commercial_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_api_key_pairs_updated_at ON api_key_pairs;
  CREATE TRIGGER update_api_key_pairs_updated_at 
    BEFORE UPDATE ON api_key_pairs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_user_meters_updated_at ON user_meters;
  CREATE TRIGGER update_user_meters_updated_at 
    BEFORE UPDATE ON user_meters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Step 12: Create helper functions
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

-- Step 13: Update project analytics view
DROP VIEW IF EXISTS project_analytics;
CREATE VIEW project_analytics AS
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

-- Migration completed successfully
SELECT 'Migration completed successfully! Commercial accounts system is now ready.' as status; 