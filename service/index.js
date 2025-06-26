/* global __webpack_hash__ */

import path from 'path'
import Express from 'express'
import { paymentMiddleware } from 'x402-express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { authenticateProject, rateLimit } from './middleware/auth.js'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import fs from 'fs'
import { supabase, dbHelpers } from './config/supabase.js'

// Load environment variables from .env file only if it exists (for development)
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const port = process.env.PORT || process.env.SERVICE_PORT || 4021
const app = new Express()
const payTo = process.env.X402_PAY_TO_ADDRESS || '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000,
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES) || 3
})

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1)
    if (error) throw error
    console.log('Connected to Supabase successfully')
  } catch (error) {
    console.error('Failed to connect to Supabase:', error.message)
  }
}

// Initialize Supabase connection
testSupabaseConnection()

// Enable CORS for all routes
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000', 
    'http://localhost:4003', 
    'http://localhost:9090',
    'https://agentmeter-frontend-hxfxqbv2ia-uc.a.run.app'
  ],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
    'Access-Control-Expose-Headers',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-Request-ID',
    'X-Response-Time'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200
}))
app.use(Express.json())

// Apply rate limiting to all routes
app.use(rateLimit)

app.use(
  paymentMiddleware(
    payTo,
    {
      'POST /chat': {
        price: '$0.001',
        network: 'base-sepolia'
      }
    },
    {
      url: 'https://x402.org/facilitator'
    }
  )
)

app.use(
  paymentMiddleware(
    payTo,
    {
      'GET /search': {
        price: '$0.001',
        network: 'base-sepolia'
      }
    },
    {
      url: 'https://x402.org/facilitator'
    }
  )
)

// Commercial Account API endpoints
app.post('/api/accounts/register', async (req, res) => {
  try {
    const { email, full_name, company_name, phone } = req.body

    if (!email || !full_name) {
      return res.status(400).json({ 
        error: 'Email and full name are required',
        required: ['email', 'full_name']
      })
    }

    // Check if account already exists
    const existingAccount = await dbHelpers.getCommercialAccountByEmail(email)
    if (existingAccount) {
      return res.status(409).json({ error: 'Account with this email already exists' })
    }

    const accountData = {
      email,
      full_name,
      company_name: company_name || null,
      phone: phone || null,
      status: 'active',
      subscription_tier: 'free',
      auth_provider: 'email'
    }

    const account = await dbHelpers.createCommercialAccount(accountData)

    res.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        full_name: account.full_name,
        company_name: account.company_name,
        status: account.status,
        subscription_tier: account.subscription_tier,
        created_at: account.created_at
      }
    })
  } catch (error) {
    console.error('Error creating account:', error)
    res.status(500).json({ error: 'Failed to create account' })
  }
})

app.get('/api/accounts/profile', authenticateProject, (req, res) => {
  if (!req.account) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  res.json({
    success: true,
    account: {
      id: req.account.id,
      email: req.account.email,
      full_name: req.account.full_name,
      company_name: req.account.company_name,
      status: req.account.status,
      subscription_tier: req.account.subscription_tier,
      created_at: req.account.created_at
    }
  })
})

// Project API endpoints (updated for commercial accounts)
app.post('/api/projects', authenticateProject, async (req, res) => {
  try {
    const { name, description, settings } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }

    if (!req.account) {
      return res.status(401).json({ error: 'Account authentication required' })
    }

    const projectId = `proj_${uuidv4().replace(/-/g, '').substring(0, 8)}`
    const secretKey = `sk_live_${uuidv4().replace(/-/g, '')}`

    const projectData = {
      id: projectId,
      account_id: req.account.id,
      name,
      description: description || '',
      status: 'active',
      secret_key: secretKey,
      settings: settings || {
        requestPricing: parseFloat(process.env.DEFAULT_REQUEST_PRICE) || 0.001,
        inputTokenPricing: parseFloat(process.env.DEFAULT_INPUT_TOKEN_PRICE) || 0.002,
        outputTokenPricing: parseFloat(process.env.DEFAULT_OUTPUT_TOKEN_PRICE) || 0.004
      },
      billing_enabled: true,
      created_date: new Date().toISOString().split('T')[0]
    }

    const project = await dbHelpers.createProject(projectData)

    // Generate initial API key pair for the project
    const initialKeyPair = await dbHelpers.generateApiKeyPair(
      req.account.id,
      projectId,
      'Default Key',
      { read: true, write: true, admin: false }
    )

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        secret_key: project.secret_key, // Legacy compatibility
        created: project.created_date,
        account: {
          id: project.commercial_accounts.id,
          email: project.commercial_accounts.email,
          full_name: project.commercial_accounts.full_name
        }
      },
      api_key_pair: {
        api_key: initialKeyPair.api_key,
        secret_key: initialKeyPair.secret_key,
        name: 'Default Key'
      }
    })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Legacy endpoint for backward compatibility
app.post('/api/project/create', async (req, res) => {
  // Redirect to new endpoint
  return res.status(301).json({
    error: 'This endpoint has moved',
    new_endpoint: 'POST /api/projects',
    message: 'Please use the new commercial account system'
  })
})

app.get('/api/projects/:projectId', authenticateProject, async (req, res) => {
  try {
    const { projectId } = req.params

    const project = await dbHelpers.getProject(projectId)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Check if user has access to this project
    if (req.account && project.account_id !== req.account.id) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        secret_key: project.secret_key, // Legacy compatibility
        settings: project.settings,
        billing_enabled: project.billing_enabled,
        created: project.created_date,
        createdAt: project.created_at,
        account: {
          id: project.commercial_accounts.id,
          email: project.commercial_accounts.email,
          full_name: project.commercial_accounts.full_name
        }
      }
    })
  } catch (error) {
    console.error('Error loading project:', error)
    res.status(500).json({ error: 'Failed to load project' })
  }
})

app.get('/api/projects', authenticateProject, async (req, res) => {
  try {
    let projects

    if (req.account) {
      // Get projects for the authenticated account
      projects = await dbHelpers.getProjectsByAccount(req.account.id)
    } else {
      // Fallback for legacy authentication - get all projects (admin access)
      projects = await dbHelpers.getAllProjects()
    }

    res.json({
      success: true,
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        created: project.created_date,
        createdAt: project.created_at,
        account: project.commercial_accounts ? {
          email: project.commercial_accounts.email,
          full_name: project.commercial_accounts.full_name
        } : null
      }))
    })
  } catch (error) {
    console.error('Error loading projects:', error)
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

// API Key Management endpoints
app.post('/api/projects/:projectId/api-keys', authenticateProject, async (req, res) => {
  try {
    const { projectId } = req.params
    const { name, permissions } = req.body

    if (!req.account) {
      return res.status(401).json({ error: 'Account authentication required' })
    }

    if (!name) {
      return res.status(400).json({ error: 'Key name is required' })
    }

    // Verify project ownership
    const project = await dbHelpers.getProject(projectId)
    if (!project || project.account_id !== req.account.id) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const keyPair = await dbHelpers.generateApiKeyPair(
      req.account.id,
      projectId,
      name,
      permissions || { read: true, write: true, admin: false }
    )

    res.json({
      success: true,
      api_key_pair: {
        id: keyPair.key_id,
        name,
        api_key: keyPair.api_key,
        secret_key: keyPair.secret_key,
        permissions: permissions || { read: true, write: true, admin: false }
      }
    })
  } catch (error) {
    console.error('Error creating API key pair:', error)
    res.status(500).json({ error: 'Failed to create API key pair' })
  }
})

app.get('/api/projects/:projectId/api-keys', authenticateProject, async (req, res) => {
  try {
    const { projectId } = req.params

    if (!req.account) {
      return res.status(401).json({ error: 'Account authentication required' })
    }

    // Verify project ownership
    const project = await dbHelpers.getProject(projectId)
    if (!project || project.account_id !== req.account.id) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const apiKeys = await dbHelpers.getApiKeyPairs(req.account.id, projectId)

    res.json({
      success: true,
      api_keys: apiKeys
    })
  } catch (error) {
    console.error('Error loading API keys:', error)
    res.status(500).json({ error: 'Failed to load API keys' })
  }
})

app.delete('/api/api-keys/:keyId', authenticateProject, async (req, res) => {
  try {
    const { keyId } = req.params

    if (!req.account) {
      return res.status(401).json({ error: 'Account authentication required' })
    }

    const result = await dbHelpers.revokeApiKey(keyId, req.account.id)

    res.json({
      success: true,
      message: 'API key revoked successfully',
      revoked_key: result
    })
  } catch (error) {
    console.error('Error revoking API key:', error)
    res.status(500).json({ error: 'Failed to revoke API key' })
  }
})

app.get('/api/billing/records', async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    const records = await dbHelpers.getBillingRecords(project_id);
    res.json({
      success: true,
      records: records.map(record => ({
        id: record.id,
        period_start: record.period_start,
        period_end: record.period_end,
        usage: record.usage,
        amount: record.amount,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at
      }))
    });
  } catch (error) {
    console.error('Error loading billing records:', error);
    res.status(500).json({ error: 'Failed to load billing records' });
  }
});

app.put('/api/projects/:projectId', authenticateProject, async (req, res) => {
  try {
    const { projectId } = req.params
    const { name, description, status, settings, billing_enabled } = req.body

    if (!req.account) {
      return res.status(401).json({ error: 'Account authentication required' })
    }

    // Verify project ownership
    const existingProject = await dbHelpers.getProject(projectId)
    if (!existingProject || existingProject.account_id !== req.account.id) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const updateData = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status
    if (settings) updateData.settings = settings
    if (billing_enabled !== undefined) updateData.billing_enabled = billing_enabled

    const project = await dbHelpers.updateProject(projectId, updateData)

    res.json({ 
      success: true, 
      message: 'Project updated successfully', 
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        settings: project.settings,
        billing_enabled: project.billing_enabled,
        updated_at: project.updated_at
      }
    })
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

app.delete('/api/projects/:projectId', authenticateProject, async (req, res) => {
  try {
    const { projectId } = req.params

    if (!req.account) {
      return res.status(401).json({ error: 'Account authentication required' })
    }

    // Verify project ownership
    const project = await dbHelpers.getProject(projectId)
    if (!project || project.account_id !== req.account.id) {
      return res.status(403).json({ error: 'Access denied to this project' })
    }

    const result = await dbHelpers.deleteProject(projectId)

    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
})

// Legacy endpoints for backward compatibility
app.put('/api/project/:id', (req, res) => {
  res.status(301).json({
    error: 'This endpoint has moved',
    new_endpoint: `PUT /api/projects/${req.params.id}`,
    message: 'Please use the new project management endpoints'
  })
})

app.delete('/api/project/:id', (req, res) => {
  res.status(301).json({
    error: 'This endpoint has moved',
    new_endpoint: `DELETE /api/projects/${req.params.id}`,
    message: 'Please use the new project management endpoints'
  })
})

// Apply authentication middleware to metering endpoints
app.use('/api/meter', authenticateProject)

// Meter events API
app.post('/api/meter/event', async (req, res) => {
  try {
    const { project_id, agent_id, user_id, tokens_in, tokens_out, api_calls, event_type } = req.body

    if (!project_id || !agent_id) {
      return res.status(400).json({ error: 'Project ID and Agent ID are required' })
    }

    // Use project settings for pricing if available, otherwise use defaults
    const project = req.project
    const settings = project?.settings || {
      requestPricing: parseFloat(process.env.DEFAULT_REQUEST_PRICE) || 0.001,
      inputTokenPricing: parseFloat(process.env.DEFAULT_INPUT_TOKEN_PRICE) || 0.002,
      outputTokenPricing: parseFloat(process.env.DEFAULT_OUTPUT_TOKEN_PRICE) || 0.004
    }

    const requestCount = api_calls || 1
    const inputTokens = tokens_in || 0
    const outputTokens = tokens_out || 0

    const eventData = {
      project_id,
      agent_id,
      user_id: user_id || 'anonymous',
      event_type: event_type || 'api_request',
      request_count: requestCount,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      request_cost: settings.requestPricing * requestCount,
      input_token_cost: (settings.inputTokenPricing * inputTokens / 1000),
      output_token_cost: (settings.outputTokenPricing * outputTokens / 1000),
      metadata: {
        timestamp: new Date().toISOString(),
        api_version: '1.0'
      }
    }

    const event = await dbHelpers.createMeteringEvent(eventData)

    // Increment user's meter usage by the event's total cost
    const meter = await dbHelpers.incrementUserMeterUsage(project_id, user_id || 'anonymous', event.total_cost)

    // Check if the user has exceeded their threshold
    if (meter && meter.current_usage >= meter.threshold_amount) {
      return res.status(402).json({
        success: false,
        error: 'Threshold exceeded. Payment required.',
        meter: {
          current_usage: meter.current_usage,
          threshold_amount: meter.threshold_amount
        }
      })
    }

    res.json({
      success: true,
      event: {
        id: event.id,
        total_cost: event.total_cost,
        timestamp: event.timestamp
      }
    })
  } catch (error) {
    console.error('Error recording meter event:', error)
    res.status(500).json({ error: 'Failed to record meter event' })
  }
})

app.get('/api/meter/events', async (req, res) => {
  try {
    const { project_id, agent_id, user_id, event_type, start_date, end_date, limit = 100, offset = 0 } = req.query

    if (!project_id) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    const filters = {
      limit: parseInt(limit) + parseInt(offset) // Supabase uses limit, not skip+limit
    }

    if (agent_id) filters.agent_id = agent_id
    if (user_id) filters.user_id = user_id
    if (event_type) filters.event_type = event_type
    if (start_date) filters.start_date = start_date
    if (end_date) filters.end_date = end_date

    const allEvents = await dbHelpers.getMeteringEvents(project_id, filters)
    
    // Manual pagination since Supabase doesn't have skip
    const events = allEvents.slice(parseInt(offset), parseInt(offset) + parseInt(limit))

    res.json({
      success: true,
      events: events.map(event => ({
        id: event.id,
        project_id: event.project_id,
        agent_id: event.agent_id,
        user_id: event.user_id,
        event_type: event.event_type,
        request_count: event.request_count,
        input_tokens: event.input_tokens,
        output_tokens: event.output_tokens,
        timestamp: event.timestamp,
        request_cost: event.request_cost,
        input_token_cost: event.input_token_cost,
        output_token_cost: event.output_token_cost,
        total_cost: event.total_cost
      })),
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: allEvents.length
      }
    })
  } catch (error) {
    console.error('Error loading meter events:', error)
    res.status(500).json({ error: 'Failed to load meter events' })
  }
})

// Meter stats API
app.get('/api/meter/stats', async (req, res) => {
  try {
    const { project_id, timeframe = '30 days' } = req.query

    if (!project_id) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    // Get all events for the project
    const allEvents = await dbHelpers.getMeteringEvents(project_id, {})
    
    // Calculate stats
    const totalEvents = allEvents.length
    const totalCost = allEvents.reduce((sum, event) => sum + (event.total_cost || 0), 0)
    const totalRequests = allEvents.reduce((sum, event) => sum + (event.request_count || 0), 0)
    const totalInputTokens = allEvents.reduce((sum, event) => sum + (event.input_tokens || 0), 0)
    const totalOutputTokens = allEvents.reduce((sum, event) => sum + (event.output_tokens || 0), 0)
    
    // Group by agent
    const agentStats = {}
    allEvents.forEach(event => {
      const agentId = event.agent_id
      if (!agentStats[agentId]) {
        agentStats[agentId] = {
          agent_id: agentId,
          events: 0,
          total_cost: 0,
          total_requests: 0,
          total_input_tokens: 0,
          total_output_tokens: 0
        }
      }
      agentStats[agentId].events += 1
      agentStats[agentId].total_cost += event.total_cost || 0
      agentStats[agentId].total_requests += event.request_count || 0
      agentStats[agentId].total_input_tokens += event.input_tokens || 0
      agentStats[agentId].total_output_tokens += event.output_tokens || 0
    })

    // Group by event type
    const eventTypeStats = {}
    allEvents.forEach(event => {
      const eventType = event.event_type
      if (!eventTypeStats[eventType]) {
        eventTypeStats[eventType] = {
          event_type: eventType,
          events: 0,
          total_cost: 0
        }
      }
      eventTypeStats[eventType].events += 1
      eventTypeStats[eventType].total_cost += event.total_cost || 0
    })

    res.json({
      success: true,
      stats: {
        timeframe,
        summary: {
          total_events: totalEvents,
          total_cost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimal places
          total_requests: totalRequests,
          total_input_tokens: totalInputTokens,
          total_output_tokens: totalOutputTokens,
          average_cost_per_request: totalRequests > 0 ? Math.round((totalCost / totalRequests) * 10000) / 10000 : 0
        },
        by_agent: Object.values(agentStats).map(agent => ({
          ...agent,
          total_cost: Math.round(agent.total_cost * 10000) / 10000
        })),
        by_event_type: Object.values(eventTypeStats).map(type => ({
          ...type,
          total_cost: Math.round(type.total_cost * 10000) / 10000
        }))
      }
    })
  } catch (error) {
    console.error('Error loading meter stats:', error)
    res.status(500).json({ error: 'Failed to load meter stats' })
  }
})

app.get('/health', async (req, res) => {
  let supabaseStatus = 'disconnected'
  
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1)
    supabaseStatus = error ? 'error' : 'connected'
  } catch (error) {
    supabaseStatus = 'error'
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: supabaseStatus,
    environment: process.env.NODE_ENV || 'development'
  })
})

app.get('/search', async (req, res) => {
  try {
    const query = req.query.query
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' })
    }

    // Compose a system prompt for search
    const messages = [
      { role: 'system', content: 'You are a helpful AI search assistant. Answer the user query as accurately as possible.' },
      { role: 'user', content: query }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000,
      temperature: 0.2
    })

    const response = completion.choices[0]?.message?.content
    const usage = completion.usage

    if (!response) {
      return res.status(500).json({ error: 'No response received from OpenAI' })
    }

    res.json({
      success: true,
      response,
      usage: {
        prompt_tokens: usage?.prompt_tokens,
        completion_tokens: usage?.completion_tokens,
        total_tokens: usage?.total_tokens
      }
    })
  } catch (error) {
    console.error('Error in search API:', error)
    if (error.status === 401) {
      return res.status(401).json({ error: 'OpenAI API key is invalid or missing' })
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded for OpenAI API' })
    }
    if (error.type === 'APIConnectionTimeoutError' || error.code === 'TIMEOUT') {
      return res.status(408).json({ error: 'Request timed out. Please try again in a moment.' })
    }
    if (error.type === 'APIConnectionError' || error.code === 'NETWORK_ERROR') {
      return res.status(503).json({ error: 'Unable to connect to OpenAI API. Please check your internet connection and try again.' })
    }
    res.status(500).json({ error: 'Failed to process search request', details: error.message })
  }
})

app.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-3.5-turbo', max_tokens = 1000, temperature = 0.7 } = req.body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Messages array is required and must not be empty'
      })
    }

    console.log('/chat', messages)

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature
    })

    const response = completion.choices[0]?.message?.content
    const usage = completion.usage

    if (!response) {
      return res.status(500).json({
        error: 'No response received from OpenAI'
      })
    }

    // Record metering event if project context is available
    if (req.project) {
      try {
        // Use project settings for pricing
        const settings = req.project.settings || {
          requestPricing: parseFloat(process.env.DEFAULT_REQUEST_PRICE) || 0.001,
          inputTokenPricing: parseFloat(process.env.DEFAULT_INPUT_TOKEN_PRICE) || 0.002,
          outputTokenPricing: parseFloat(process.env.DEFAULT_OUTPUT_TOKEN_PRICE) || 0.004
        }

        const eventData = {
          project_id: req.project.id,
          agent_id: 'chat-api',
          user_id: req.headers['x-user-id'] || 'anonymous',
          event_type: 'api_request',
          request_count: 1,
          input_tokens: usage?.prompt_tokens || 0,
          output_tokens: usage?.completion_tokens || 0,
          request_cost: settings.requestPricing,
          input_token_cost: (settings.inputTokenPricing * (usage?.prompt_tokens || 0) / 1000),
          output_token_cost: (settings.outputTokenPricing * (usage?.completion_tokens || 0) / 1000),
          metadata: {
            model,
            max_tokens,
            temperature,
            api_endpoint: '/chat'
          }
        }

        await dbHelpers.createMeteringEvent(eventData)
      } catch (meterError) {
        console.error('Error recording meter event:', meterError)
        // Don't fail the request if metering fails
      }
    }

    res.json({
      success: true,
      response,
      usage: {
        prompt_tokens: usage?.prompt_tokens,
        completion_tokens: usage?.completion_tokens,
        total_tokens: usage?.total_tokens
      }
    })

  } catch (error) {
    console.error('Error in chat API:', error)

    if (error.status === 401) {
      return res.status(401).json({
        error: 'OpenAI API key is invalid or missing'
      })
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded for OpenAI API'
      })
    }

    // Handle timeout and connection errors
    if (error.type === 'APIConnectionTimeoutError' || error.code === 'TIMEOUT') {
      return res.status(408).json({
        error: 'Request timed out. Please try again in a moment.'
      })
    }

    if (error.type === 'APIConnectionError' || error.code === 'NETWORK_ERROR') {
      return res.status(503).json({
        error: 'Unable to connect to OpenAI API. Please check your internet connection and try again.'
      })
    }

    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    })
  }
})

// Get meter usage for a user (no payment)
app.get('/api/meter/usage', async (req, res) => {
  try {
    const project_id = req.query.project_id || req.headers['x-project-id']
    const user_id = req.query.user_id || req.headers['x-user-id']
    if (!project_id || !user_id) {
      return res.status(400).json({ error: 'project_id and user_id are required' })
    }
    const meter = await dbHelpers.getUserMeter(project_id, user_id)
    if (!meter) {
      return res.status(404).json({ error: 'Meter record not found' })
    }
    res.json({
      success: true,
      meter: {
        current_usage: meter.current_usage,
        threshold_amount: meter.threshold_amount,
        last_reset_at: meter.last_reset_at
      }
    })
  } catch (error) {
    console.error('Error getting meter usage:', error)
    res.status(500).json({ error: 'Failed to get meter usage' })
  }
})

// Get meter usage and reset after payment
app.post('/api/meter/usage_with_pay', async (req, res) => {
  try {
    const project_id = req.body.project_id || req.headers['x-project-id']
    const user_id = req.body.user_id || req.headers['x-user-id']
    if (!project_id || !user_id) {
      return res.status(400).json({ error: 'project_id and user_id are required' })
    }
    const meter = await dbHelpers.getUserMeter(project_id, user_id)
    if (!meter) {
      return res.status(404).json({ error: 'Meter record not found' })
    }
    // Here you can add payment verification logic if needed
    // Reset the meter after payment
    await dbHelpers.resetUserMeter(project_id, user_id)
    res.json({
      success: true,
      meter: {
        current_usage: meter.current_usage,
        threshold_amount: meter.threshold_amount,
        last_reset_at: meter.last_reset_at
      },
      message: 'Meter reset after payment.'
    })
  } catch (error) {
    console.error('Error in meter usage pay:', error)
    res.status(500).json({ error: 'Failed to process meter usage payment' })
  }
})

// Set User Meter (documented as PUT /meter but implemented as PUT /api/meter)
app.put('/api/meter', async (req, res) => {
  try {
    const { project_id, user_id, threshold_amount } = req.body

    if (!project_id || !user_id || threshold_amount === undefined) {
      return res.status(400).json({ 
        error: 'project_id, user_id, and threshold_amount are required' 
      })
    }

    const meter = await dbHelpers.setUserMeter(project_id, user_id, threshold_amount)

    res.json({
      success: true,
      meter: {
        project_id: meter.project_id,
        user_id: meter.user_id,
        threshold_amount: meter.threshold_amount,
        current_usage: meter.current_usage || 0,
        last_reset_at: meter.last_reset_at || meter.updated_at,
        updated_at: meter.updated_at
      }
    })
  } catch (error) {
    console.error('Error setting user meter:', error)
    res.status(500).json({ error: 'Failed to set user meter' })
  }
})

// Increment User Meter Usage (documented as POST /meter/increment but implemented as POST /api/meter/increment)
app.post('/api/meter/increment', async (req, res) => {
  try {
    const { project_id, user_id, amount } = req.body

    if (!project_id || !user_id || amount === undefined) {
      return res.status(400).json({ 
        error: 'project_id, user_id, and amount are required' 
      })
    }

    const meter = await dbHelpers.incrementUserMeterUsage(project_id, user_id, amount)

    res.json({
      success: true,
      meter: {
        project_id: meter.project_id,
        user_id: meter.user_id,
        threshold_amount: meter.threshold_amount,
        current_usage: meter.current_usage,
        last_reset_at: meter.last_reset_at,
        updated_at: meter.updated_at
      }
    })
  } catch (error) {
    console.error('Error incrementing user meter usage:', error)
    res.status(500).json({ error: 'Failed to increment user meter usage' })
  }
})

// Reset User Meter (documented as POST /meter/reset but implemented as POST /api/meter/reset)
app.post('/api/meter/reset', async (req, res) => {
  try {
    const { project_id, user_id } = req.body

    if (!project_id || !user_id) {
      return res.status(400).json({ 
        error: 'project_id and user_id are required' 
      })
    }

    const meter = await dbHelpers.resetUserMeter(project_id, user_id)

    res.json({
      success: true,
      meter: {
        project_id: meter.project_id,
        user_id: meter.user_id,
        threshold_amount: meter.threshold_amount,
        current_usage: meter.current_usage,
        last_reset_at: meter.last_reset_at,
        updated_at: meter.updated_at
      }
    })
  } catch (error) {
    console.error('Error resetting user meter:', error)
    res.status(500).json({ error: 'Failed to reset user meter' })
  }
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
