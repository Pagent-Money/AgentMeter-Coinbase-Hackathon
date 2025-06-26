import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables from .env file only if it exists (for development)
const envPath = path.resolve(process.cwd(), 'service', '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Environment variables:', {
    SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'MISSING'
  })
  throw new Error('Missing Supabase environment variables. Please check your environment configuration.')
}

// Create Supabase client with service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database helper functions
export const dbHelpers = {
  // Commercial Accounts
  async createCommercialAccount(accountData) {
    const { data, error } = await supabase
      .from('commercial_accounts')
      .insert([accountData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getCommercialAccount(accountId) {
    const { data, error } = await supabase
      .from('commercial_accounts')
      .select('*')
      .eq('id', accountId)
      .single()
    
    if (error) throw error
    return data
  },

  async getCommercialAccountByEmail(email) {
    const { data, error } = await supabase
      .from('commercial_accounts')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async updateCommercialAccount(accountId, updateData) {
    const { data, error } = await supabase
      .from('commercial_accounts')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // API Key Pairs
  async generateApiKeyPair(accountId, projectId, name, permissions) {
    const { data, error } = await supabase
      .rpc('generate_api_key_pair', {
        p_account_id: accountId,
        p_project_id: projectId,
        p_name: name,
        p_permissions: permissions
      })
    
    if (error) throw error
    return data[0] // Returns {api_key, secret_key, key_id}
  },

  async getApiKeyPairs(accountId, projectId = null) {
    let query = supabase
      .from('api_key_pairs')
      .select('id, name, api_key, status, permissions, last_used_at, expires_at, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async revokeApiKey(keyId, accountId) {
    const { data, error } = await supabase
      .from('api_key_pairs')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('account_id', accountId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Projects (updated for commercial accounts)
  async createProject(projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select(`
        *,
        commercial_accounts!inner(id, email, full_name, company_name)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async getProject(projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        commercial_accounts!inner(id, email, full_name, company_name)
      `)
      .eq('id', projectId)
      .single()
    
    if (error) throw error
    return data
  },

  async getAllProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        commercial_accounts!inner(id, email, full_name, company_name)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getProjectsByAccount(accountId) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        commercial_accounts!inner(id, email, full_name, company_name)
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async updateProject(projectId, updateData) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteProject(projectId) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
    
    if (error) throw error
    return true
  },

  // Metering Events
  async createMeteringEvent(eventData) {
    const { data, error } = await supabase
      .from('metering_events')
      .insert([eventData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getMeteringEvents(projectId, filters = {}) {
    let query = supabase
      .from('metering_events')
      .select('*')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false })

    // Apply filters
    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id)
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.event_type) {
      query = query.eq('event_type', filters.event_type)
    }
    if (filters.start_date) {
      query = query.gte('timestamp', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('timestamp', filters.end_date)
    }
    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    
    if (error) throw error
    return data
  },

  async getMeteringStats(projectId, timeframe = '30 days') {
    const { data, error } = await supabase
      .rpc('get_metering_stats', {
        p_project_id: projectId,
        p_timeframe: timeframe
      })
    
    if (error) throw error
    return data
  },

  // Billing Records
  async createBillingRecord(billingData) {
    const { data, error } = await supabase
      .from('billing_records')
      .insert([billingData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getBillingRecords(projectId) {
    const { data, error } = await supabase
      .from('billing_records')
      .select('*')
      .eq('project_id', projectId)
      .order('period_start', { ascending: false })
    
    if (error) throw error
    return data
  },

  async updateBillingRecord(recordId, updateData) {
    const { data, error } = await supabase
      .from('billing_records')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', recordId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // User Meters (updated table name)
  async getUserMeter(projectId, userId) {
    const { data, error } = await supabase
      .rpc('get_or_create_user_meter', {
        p_project_id: projectId,
        p_user_id: userId
      })
    
    if (error) throw error
    return data[0] // Returns the meter record
  },

  async setUserMeter(projectId, userId, amount) {
    const { data, error } = await supabase
      .from('user_meters')
      .upsert({
        project_id: projectId,
        user_id: userId,
        threshold_amount: amount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async incrementUserMeterUsage(projectId, userId, amount) {
    // Increment current_usage and return updated row
    const { data, error } = await supabase
      .from('user_meters')
      .update({
        current_usage: supabase.sql`current_usage + ${amount}`,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async resetUserMeter(projectId, userId) {
    // Reset current_usage to 0 and update last_reset_at
    const { data, error } = await supabase
      .from('user_meters')
      .update({
        current_usage: 0,
        last_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

export default supabase 