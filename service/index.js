/* global __webpack_hash__ */

import path from 'path'
import Express from 'express'
import { paymentMiddleware } from 'x402-express'
import cors from 'cors'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { authenticateProject, rateLimit } from './middleware/auth.js'

const port = 4021
const app = new Express()
const payTo = '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5'

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentmeter'
let db = null

async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db("agentmeter")
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
  }
}

// Initialize database connection
connectToDatabase()

// Enable CORS for all routes
app.use(cors())
app.use(Express.json())

// Apply rate limiting to all routes
app.use(rateLimit)

app.use(
  paymentMiddleware(
    payTo,
    {
      'GET /chat': {
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
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' })
    }

    const { name, description, settings } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }

    const projectId = `proj_${uuidv4().replace(/-/g, '').substring(0, 8)}`
    const secretKey = `sk_live_${uuidv4().replace(/-/g, '')}`
    
    const project = {
      id: projectId,
      name,
      description: description || '',
      status: 'Active',
      secret_key: secretKey,
      settings: settings || {
        requestPricing: 0.001,
        inputTokenPricing: 0.002,
        outputTokenPricing: 0.004
      },
      created: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const projectsCollection = db.collection("projects")
    await projectsCollection.insertOne(project)

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        secret_key: project.secret_key,
        created: project.created
      }
    })
  } catch (error) {
    console.error('Error creating project:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

app.get('/api/project/load', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' })
    }

    const { id } = req.query
    
    if (!id) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    const projectsCollection = db.collection("projects")
    const project = await projectsCollection.findOne({ id })

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
        created: project.created,
        createdAt: project.createdAt
      }
    })
  } catch (error) {
    console.error('Error loading project:', error)
    res.status(500).json({ error: 'Failed to load project' })
  }
})

app.get('/api/projects', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' })
    }

    const projectsCollection = db.collection("projects")
    const projects = await projectsCollection.find({}).toArray()

    res.json({
      success: true,
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        created: project.created,
        createdAt: project.createdAt
      }))
    })
  } catch (error) {
    console.error('Error loading projects:', error)
    res.status(500).json({ error: 'Failed to load projects' })
  }
})

app.put('/api/project/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' })
    }

    const { id } = req.params
    const { name, description, status, settings } = req.body

    const projectsCollection = db.collection("projects")
    const updateData = { updatedAt: new Date() }

    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status
    if (settings) updateData.settings = settings

    const result = await projectsCollection.updateOne(
      { id },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json({ success: true, message: 'Project updated successfully' })
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ error: 'Failed to update project' })
  }
})

app.delete('/api/project/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' })
    }

    const { id } = req.params

    const projectsCollection = db.collection("projects")
    const result = await projectsCollection.deleteOne({ id })

    if (result.deletedCount === 0) {
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
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' })
    }

    const { project_id, agent_id, user_id, tokens_in, tokens_out, api_calls } = req.body

    if (!project_id || !agent_id) {
      return res.status(400).json({ error: 'Project ID and Agent ID are required' })
    }

    // Use project settings for pricing if available, otherwise use defaults
    const project = req.project
    const settings = project?.settings || {
      requestPricing: 0.001,
      inputTokenPricing: 0.002,
      outputTokenPricing: 0.004
    }

    const event = {
      project_id,
      agent_id,
      user_id: user_id || 'anonymous',
      tokens_in: tokens_in || 0,
      tokens_out: tokens_out || 0,
      api_calls: api_calls || 1,
      timestamp: new Date(),
      request_cost: settings.requestPricing * (api_calls || 1),
      token_cost: (settings.inputTokenPricing * (tokens_in || 0) / 1000) + (settings.outputTokenPricing * (tokens_out || 0) / 1000),
      total_cost: 0
    }

    event.total_cost = event.request_cost + event.token_cost

    const eventsCollection = db.collection("meter_events")
    await eventsCollection.insertOne(event)

    res.json({
      success: true,
      event: {
        id: event._id,
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
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' })
    }

    const { project_id, agent_id, limit = 100, offset = 0 } = req.query

    const eventsCollection = db.collection("meter_events")
    let query = {}

    if (project_id) query.project_id = project_id
    if (agent_id) query.agent_id = agent_id

    const events = await eventsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray()

    res.json({
      success: true,
      events: events.map(event => ({
        id: event._id,
        project_id: event.project_id,
        agent_id: event.agent_id,
        user_id: event.user_id,
        tokens_in: event.tokens_in,
        tokens_out: event.tokens_out,
        api_calls: event.api_calls,
        timestamp: event.timestamp,
        request_cost: event.request_cost,
        token_cost: event.token_cost,
        total_cost: event.total_cost
      }))
    })
  } catch (error) {
    console.error('Error loading meter events:', error)
    res.status(500).json({ error: 'Failed to load meter events' })
  }
})

app.get('/chat', (req, res) => {
  res.send({
    report: {
      chat: 'sunny',
      temperature: 70
    }
  })
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
