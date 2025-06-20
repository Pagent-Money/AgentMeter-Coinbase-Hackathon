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
  // Projects
  async createProject(projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getProject(projectId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    
    if (error) throw error
    return data
  },

  async getAllProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
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
  }
}

export default supabase 