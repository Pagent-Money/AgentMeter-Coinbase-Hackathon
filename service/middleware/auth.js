// Authentication middleware for project secret keys
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentmeter'
let db = null

async function connectToDatabase() {
  if (!db) {
    try {
      const client = new MongoClient(MONGODB_URI)
      await client.connect()
      db = client.db("agentmeter")
      console.log('Connected to MongoDB for auth middleware')
    } catch (error) {
      console.error('Failed to connect to MongoDB for auth middleware:', error)
    }
  }
  return db
}

// Validate project secret key
async function validateProjectSecret(projectId, secretKey) {
  try {
    const database = await connectToDatabase()
    if (!database) {
      return { valid: false, error: 'Database not connected' }
    }

    const projectsCollection = database.collection("projects")
    const project = await projectsCollection.findOne({ 
      id: projectId,
      secret_key: secretKey,
      status: 'Active'
    })

    if (!project) {
      return { valid: false, error: 'Invalid project ID or secret key' }
    }

    return { valid: true, project }
  } catch (error) {
    console.error('Error validating project secret:', error)
    return { valid: false, error: 'Authentication error' }
  }
}

// Authentication middleware
export function authenticateProject(req, res, next) {
  // Skip authentication for non-metering endpoints
  if (!req.path.startsWith('/api/meter')) {
    return next()
  }

  const authHeader = req.headers.authorization
  const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id

  if (!authHeader || !projectId) {
    return res.status(401).json({ 
      error: 'Missing authorization header or project ID',
      required: ['Authorization: Bearer <secret_key>', 'X-Project-ID: <project_id>']
    })
  }

  // Extract secret key from Authorization header
  const secretKey = authHeader.replace('Bearer ', '')

  if (!secretKey) {
    return res.status(401).json({ 
      error: 'Invalid authorization header format',
      format: 'Authorization: Bearer <secret_key>'
    })
  }

  // Validate the project secret key
  validateProjectSecret(projectId, secretKey)
    .then(({ valid, project, error }) => {
      if (!valid) {
        return res.status(401).json({ error })
      }

      // Add project info to request for later use
      req.project = project
      next()
    })
    .catch(error => {
      console.error('Authentication error:', error)
      res.status(500).json({ error: 'Authentication service error' })
    })
}

// Optional authentication middleware (for endpoints that can work without auth)
export function optionalAuthenticateProject(req, res, next) {
  const authHeader = req.headers.authorization
  const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id

  if (!authHeader || !projectId) {
    // Continue without authentication
    return next()
  }

  // Extract secret key from Authorization header
  const secretKey = authHeader.replace('Bearer ', '')

  if (!secretKey) {
    // Continue without authentication
    return next()
  }

  // Validate the project secret key
  validateProjectSecret(projectId, secretKey)
    .then(({ valid, project, error }) => {
      if (valid) {
        req.project = project
      }
      next()
    })
    .catch(error => {
      console.error('Optional authentication error:', error)
      next() // Continue even if authentication fails
    })
}

// Rate limiting middleware (basic implementation)
const requestCounts = new Map()

export function rateLimit(req, res, next) {
  const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id
  const key = `${projectId}:${req.ip}`
  
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 100 // Max requests per minute per project/IP

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
  } else {
    const record = requestCounts.get(key)
    
    if (now > record.resetTime) {
      // Reset window
      record.count = 1
      record.resetTime = now + windowMs
    } else {
      record.count++
      
      if (record.count > maxRequests) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          limit: maxRequests,
          window: '1 minute'
        })
      }
    }
  }

  next()
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes

export { validateProjectSecret } 