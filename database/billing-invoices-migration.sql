-- Create invoices table for x402 billing system
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  account_id UUID NOT NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Create billing_transactions table for payment tracking
CREATE TABLE IF NOT EXISTS billing_transactions (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) REFERENCES invoices(id),
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

-- Create payment_methods table for user payment preferences
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(255) PRIMARY KEY,
  account_id UUID NOT NULL,
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

-- Create billing_events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
  id VARCHAR(255) PRIMARY KEY,
  invoice_id VARCHAR(255) REFERENCES invoices(id),
  event_type VARCHAR(50) NOT NULL, -- 'created', 'paid', 'failed', 'refunded'
  event_data JSONB,
  user_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_invoice_id ON billing_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);

-- Add foreign key constraints (if tables exist and types are compatible)
DO $$
DECLARE
  projects_id_type text;
  accounts_id_type text;
BEGIN
  -- Check if projects table exists and get the id column type
  SELECT data_type INTO projects_id_type
  FROM information_schema.columns 
  WHERE table_name = 'projects' AND column_name = 'id';
  
  -- Check if commercial_accounts table exists and get the id column type
  SELECT data_type INTO accounts_id_type
  FROM information_schema.columns 
  WHERE table_name = 'commercial_accounts' AND column_name = 'id';
  
  -- Add foreign key to projects table if it exists
  IF projects_id_type IS NOT NULL THEN
    -- Modify project_id column type to match projects.id if needed
    IF projects_id_type = 'uuid' THEN
      ALTER TABLE invoices ALTER COLUMN project_id TYPE UUID USING project_id::UUID;
    END IF;
    
    -- Add the foreign key constraint
    ALTER TABLE invoices ADD CONSTRAINT fk_invoices_project_id 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  
  -- Add foreign key to commercial_accounts table if it exists
  IF accounts_id_type IS NOT NULL THEN
    -- The account_id column is already UUID type
    ALTER TABLE invoices ADD CONSTRAINT fk_invoices_account_id 
    FOREIGN KEY (account_id) REFERENCES commercial_accounts(id) ON DELETE CASCADE;
    
    ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_account_id 
    FOREIGN KEY (account_id) REFERENCES commercial_accounts(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Foreign keys already exist, skip
    NULL;
  WHEN others THEN
    -- Log the error but don't fail the migration
    RAISE NOTICE 'Foreign key creation failed: %', SQLERRM;
END $$;

-- Create updated_at trigger for invoices
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to invoices table
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to payment_methods table
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
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
ON CONFLICT (key) DO NOTHING;

-- Create projects_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects_settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply trigger to projects_settings table
DROP TRIGGER IF EXISTS update_projects_settings_updated_at ON projects_settings;
CREATE TRIGGER update_projects_settings_updated_at
  BEFORE UPDATE ON projects_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 