-- Fixed billing migration with proper type handling
-- This version handles UUID vs VARCHAR type mismatches

-- First, let's check the existing table structure
DO $$
DECLARE
  projects_id_type text;
  accounts_id_type text;
  projects_exists boolean := false;
  accounts_exists boolean := false;
BEGIN
  -- Check if tables exist and get their ID column types
  SELECT data_type INTO projects_id_type
  FROM information_schema.columns 
  WHERE table_name = 'projects' AND column_name = 'id';
  
  SELECT data_type INTO accounts_id_type
  FROM information_schema.columns 
  WHERE table_name = 'commercial_accounts' AND column_name = 'id';
  
  projects_exists := projects_id_type IS NOT NULL;
  accounts_exists := accounts_id_type IS NOT NULL;
  
  RAISE NOTICE 'Projects table exists: %, ID type: %', projects_exists, COALESCE(projects_id_type, 'N/A');
  RAISE NOTICE 'Commercial accounts table exists: %, ID type: %', accounts_exists, COALESCE(accounts_id_type, 'N/A');
END $$;

-- Create invoices table with proper column types
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL, -- Will be converted to UUID if needed
  account_id UUID NOT NULL, -- Set to UUID to match commercial_accounts.id
  amount DECIMAL(10, 6) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'x402_crypto',
  wallet_address VARCHAR(255),
  network VARCHAR(50),
  description TEXT,
  breakdown JSONB,
  line_items JSONB,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_transaction VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Create billing_transactions table
CREATE TABLE IF NOT EXISTS billing_transactions (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255),
  transaction_hash VARCHAR(255),
  block_number BIGINT,
  network VARCHAR(50),
  amount DECIMAL(10, 6),
  currency VARCHAR(10),
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  gas_used BIGINT,
  gas_price DECIMAL(20, 0),
  status VARCHAR(50) DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for billing_transactions
CREATE INDEX IF NOT EXISTS idx_billing_transactions_invoice_id ON billing_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_transaction_hash ON billing_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_billing_transactions_status ON billing_transactions(status);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL, -- Set to UUID to match commercial_accounts.id
  method_type VARCHAR(50) NOT NULL, -- 'wallet', 'x402', 'coinbase_commerce'
  wallet_address VARCHAR(255),
  network VARCHAR(50),
  is_default BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON payment_methods(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_method_type ON payment_methods(method_type);

-- Create billing_events table
CREATE TABLE IF NOT EXISTS billing_events (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL, -- 'created', 'paid', 'failed', 'refunded'
  event_data JSONB,
  user_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_invoice_id ON billing_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);

-- Add foreign key constraints with proper type handling
DO $$
DECLARE
  projects_id_type text;
  accounts_id_type text;
BEGIN
  -- Get column types
  SELECT data_type INTO projects_id_type
  FROM information_schema.columns 
  WHERE table_name = 'projects' AND column_name = 'id';
  
  SELECT data_type INTO accounts_id_type
  FROM information_schema.columns 
  WHERE table_name = 'commercial_accounts' AND column_name = 'id';
  
  -- Handle projects foreign key
  IF projects_id_type IS NOT NULL THEN
    -- Convert project_id column to UUID if projects.id is UUID
    IF projects_id_type = 'uuid' THEN
      BEGIN
        RAISE NOTICE 'Converting invoices.project_id to UUID type to match projects.id';
        ALTER TABLE invoices ALTER COLUMN project_id TYPE UUID USING project_id::UUID;
      EXCEPTION
        WHEN invalid_text_representation THEN
          RAISE NOTICE 'Warning: Some project_id values cannot be converted to UUID. Skipping foreign key creation for projects.';
          projects_id_type := NULL; -- Skip foreign key creation
      END;
    END IF;
    
    -- Add foreign key constraint if types are compatible
    IF projects_id_type IS NOT NULL THEN
      BEGIN
        ALTER TABLE invoices ADD CONSTRAINT fk_invoices_project_id 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for invoices.project_id -> projects.id';
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Foreign key constraint fk_invoices_project_id already exists';
        WHEN others THEN
          RAISE NOTICE 'Could not create foreign key for projects: %', SQLERRM;
      END;
    END IF;
  ELSE
    RAISE NOTICE 'Projects table not found, skipping project_id foreign key';
  END IF;
  
  -- Handle commercial_accounts foreign key
  IF accounts_id_type IS NOT NULL THEN
    IF accounts_id_type = 'uuid' THEN
      BEGIN
        -- Add foreign key constraints for commercial_accounts
        ALTER TABLE invoices ADD CONSTRAINT fk_invoices_account_id 
        FOREIGN KEY (account_id) REFERENCES commercial_accounts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for invoices.account_id -> commercial_accounts.id';
        
        ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_account_id 
        FOREIGN KEY (account_id) REFERENCES commercial_accounts(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for payment_methods.account_id -> commercial_accounts.id';
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE 'Foreign key constraints for commercial_accounts already exist';
        WHEN others THEN
          RAISE NOTICE 'Could not create foreign key for commercial_accounts: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Commercial accounts ID type is %, expected uuid. Skipping foreign key creation.', accounts_id_type;
    END IF;
  ELSE
    RAISE NOTICE 'Commercial accounts table not found, skipping account_id foreign key';
  END IF;
  
  -- Add foreign key for billing_transactions -> invoices
  BEGIN
    ALTER TABLE billing_transactions ADD CONSTRAINT fk_billing_transactions_invoice_id 
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint for billing_transactions.invoice_id -> invoices.id';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_billing_transactions_invoice_id already exists';
    WHEN others THEN
      RAISE NOTICE 'Could not create foreign key for billing_transactions: %', SQLERRM;
  END;
  
  -- Add foreign key for billing_events -> invoices
  BEGIN
    ALTER TABLE billing_events ADD CONSTRAINT fk_billing_events_invoice_id 
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint for billing_events.invoice_id -> invoices.id';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_billing_events_invoice_id already exists';
    WHEN others THEN
      RAISE NOTICE 'Could not create foreign key for billing_events: %', SQLERRM;
  END;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create projects_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply trigger to projects_settings
DROP TRIGGER IF EXISTS update_projects_settings_updated_at ON projects_settings;
CREATE TRIGGER update_projects_settings_updated_at
  BEFORE UPDATE ON projects_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default billing rates configuration
INSERT INTO projects_settings (key, value, description) VALUES 
  ('billing_rates', '{
    "api_request": {"price": 0.001, "currency": "USD"},
    "input_tokens": {"price": 0.002, "per_1k": true, "currency": "USD"},
    "output_tokens": {"price": 0.004, "per_1k": true, "currency": "USD"},
    "meter_event": {"price": 0.005, "currency": "USD"},
    "analytics_report": {"price": 0.010, "currency": "USD"},
    "invoice_generation": {"price": 0.015, "currency": "USD"}
  }', 'Default billing rates for x402 payment system')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Final verification
DO $$
BEGIN
  RAISE NOTICE '=== Billing Migration Complete ===';
  RAISE NOTICE 'Tables created: invoices, billing_transactions, payment_methods, billing_events, projects_settings';
  RAISE NOTICE 'Please verify foreign key constraints were created successfully';
  RAISE NOTICE 'Run: SELECT conname, contype FROM pg_constraint WHERE conrelid = ''invoices''::regclass;';
END $$; 