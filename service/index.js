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

// Project API endpoints
app.post('/api/project/create', async (req, res) => {
  try {
    const { name, description, settings } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }

    const projectId = `proj_${uuidv4().replace(/-/g, '').substring(0, 8)}`
    const secretKey = `sk_live_${uuidv4().replace(/-/g, '')}`

    const projectData = {
      id: projectId,
      name,
      description: description || '',
      status: 'Active',
      secret_key: secretKey,
      settings: settings || {
        requestPricing: parseFloat(process.env.DEFAULT_REQUEST_PRICE) || 0.001,
        inputTokenPricing: parseFloat(process.env.DEFAULT_INPUT_TOKEN_PRICE) || 0.002,
        outputTokenPricing: parseFloat(process.env.DEFAULT_OUTPUT_TOKEN_PRICE) || 0.004
      },
      created_date: new Date().toISOString().split('T')[0]
    }

    const project = await dbHelpers.createProject(projectData)

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        secret_key: project.secret_key,
        created: project.created_date
      }
    })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

app.get('/api/project/load', async (req, res) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    const project = await dbHelpers.getProject(id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        secret_key: project.secret_key,
        settings: project.settings,
        created: project.created_date,
        createdAt: project.created_at
      }
    })
  } catch (error) {
    console.error('Error loading project:', error)
    res.status(500).json({ error: 'Failed to load project' })
  }
})

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await dbHelpers.getAllProjects()

    res.json({
      success: true,
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        created: project.created_date,
        createdAt: project.created_at
      }))
    })
  } catch (error) {
    console.error('Error loading projects:', error)
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

app.put('/api/project/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, status, settings } = req.body

    const updateData = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status
    if (settings) updateData.settings = settings

    const project = await dbHelpers.updateProject(id, updateData)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({ success: true, message: 'Project updated successfully', project })
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

app.delete('/api/project/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await dbHelpers.deleteProject(id)

    if (!result) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ error: 'Failed to delete project' })
  }
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
