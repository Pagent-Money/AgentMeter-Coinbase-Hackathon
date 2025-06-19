import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables
dotenv.config({ path: './service/.env' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your service/.env file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedDatabase() {
  try {
    console.log('Connected to Supabase, seeding database...')

    // Clear existing data
    console.log('Clearing existing data...')
    await supabase.from('metering_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('billing_records').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('projects').delete().neq('id', 'dummy')

    // Seed projects
    const projects = [
      {
        id: 'proj_123abc',
        name: 'AI Assistant Bot',
        description: 'An intelligent assistant bot for customer support',
        status: 'Active',
        secret_key: 'sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890',
        settings: {
          requestPricing: 0.001,
          inputTokenPricing: 0.002,
          outputTokenPricing: 0.004
        },
        created_date: '2024-01-15'
      },
      {
        id: 'proj_456def',
        name: 'Content Generator',
        description: 'AI-powered content generation for marketing',
        status: 'Active',
        secret_key: 'sk_live_def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890abc123',
        settings: {
          requestPricing: 0.0015,
          inputTokenPricing: 0.003,
          outputTokenPricing: 0.005
        },
        created_date: '2024-02-01'
      },
      {
        id: 'proj_789ghi',
        name: 'Data Analyzer',
        description: 'Advanced data analysis and insights',
        status: 'Paused',
        secret_key: 'sk_live_ghi789jkl012mno345pqr678stu901vwx234yzabc567def890abc123def456',
        settings: {
          requestPricing: 0.002,
          inputTokenPricing: 0.004,
          outputTokenPricing: 0.006
        },
        created_date: '2024-02-10'
      }
    ]

    const { data: insertedProjects, error: projectError } = await supabase
      .from('projects')
      .insert(projects)
      .select()

    if (projectError) {
      throw projectError
    }
    console.log('Projects seeded successfully:', insertedProjects.length, 'projects')

    // Seed metering events
    const events = [
      {
        project_id: 'proj_123abc',
        agent_id: 'assistant-v1',
        user_id: 'user_123',
        event_type: 'api_request',
        request_count: 1,
        input_tokens: 150,
        output_tokens: 75,
        request_cost: 0.001,
        input_token_cost: 0.0003,
        output_token_cost: 0.0003,
        metadata: {
          model: 'gpt-3.5-turbo',
          endpoint: '/chat'
        }
      },
      {
        project_id: 'proj_456def',
        agent_id: 'content-gen-v2',
        user_id: 'user_456',
        event_type: 'api_request',
        request_count: 1,
        input_tokens: 320,
        output_tokens: 180,
        request_cost: 0.0015,
        input_token_cost: 0.00096,
        output_token_cost: 0.0009,
        metadata: {
          model: 'gpt-4',
          endpoint: '/generate'
        }
      },
      {
        project_id: 'proj_123abc',
        agent_id: 'assistant-v1',
        user_id: 'user_789',
        event_type: 'api_request',
        request_count: 1,
        input_tokens: 89,
        output_tokens: 45,
        request_cost: 0.001,
        input_token_cost: 0.000178,
        output_token_cost: 0.00018,
        metadata: {
          model: 'gpt-3.5-turbo',
          endpoint: '/chat'
        }
      },
      {
        project_id: 'proj_789ghi',
        agent_id: 'data-analyzer-v1',
        user_id: 'user_101',
        event_type: 'api_request',
        request_count: 1,
        input_tokens: 450,
        output_tokens: 220,
        request_cost: 0.002,
        input_token_cost: 0.0018,
        output_token_cost: 0.00132,
        metadata: {
          model: 'gpt-4',
          endpoint: '/analyze'
        }
      },
      {
        project_id: 'proj_456def',
        agent_id: 'content-gen-v2',
        user_id: 'user_202',
        event_type: 'api_request',
        request_count: 1,
        input_tokens: 280,
        output_tokens: 160,
        request_cost: 0.0015,
        input_token_cost: 0.00084,
        output_token_cost: 0.0008,
        metadata: {
          model: 'gpt-4',
          endpoint: '/generate'
        }
      }
    ]

    const { data: insertedEvents, error: eventError } = await supabase
      .from('metering_events')
      .insert(events)
      .select()

    if (eventError) {
      throw eventError
    }
    console.log('Metering events seeded successfully:', insertedEvents.length, 'events')

    // Seed billing records
    const billingRecords = [
      {
        project_id: 'proj_123abc',
        period_start: '2024-02-01',
        period_end: '2024-02-28',
        total_requests: 25,
        total_input_tokens: 3750,
        total_output_tokens: 1875,
        total_amount: 0.15,
        status: 'paid'
      },
      {
        project_id: 'proj_456def',
        period_start: '2024-02-01',
        period_end: '2024-02-28',
        total_requests: 40,
        total_input_tokens: 12000,
        total_output_tokens: 6800,
        total_amount: 0.45,
        status: 'pending'
      }
    ]

    const { data: insertedBilling, error: billingError } = await supabase
      .from('billing_records')
      .insert(billingRecords)
      .select()

    if (billingError) {
      throw billingError
    }
    console.log('Billing records seeded successfully:', insertedBilling.length, 'records')

    console.log('✅ Database seeding completed successfully!')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

seedDatabase()
