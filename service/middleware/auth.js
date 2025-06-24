// Authentication middleware for project secret keys
import { supabase, dbHelpers } from '../config/supabase.js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(process.cwd(), 'service', '.env') })

// Validate project secret key
async function validateProjectSecret(projectId, secretKey) {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('secret_key', secretKey)
      .eq('status', 'Active')
      .single()

    if (error || !project) {
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

  const authHeader = req.headers.authorization || req.headers['x-project-secret']
  const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id

  if (!authHeader || !projectId) {
    return res.status(401).json({ 
      error: 'Missing authorization header or project ID',
      required: ['Authorization: Bearer <secret_key> OR X-Project-Secret: <secret_key>', 'X-Project-ID: <project_id>']
    })
  }

  // Extract secret key from Authorization header or X-Project-Secret header
  const secretKey = authHeader.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '')
    : authHeader

  if (!secretKey) {
    return res.status(401).json({ 
      error: 'Invalid authorization header format',
      format: 'Authorization: Bearer <secret_key> OR X-Project-Secret: <secret_key>'
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
  const authHeader = req.headers.authorization || req.headers['x-project-secret']
  const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id

  if (!authHeader || !projectId) {
    // Continue without authentication
    return next()
  }

  // Extract secret key from Authorization header or X-Project-Secret header
  const secretKey = authHeader.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '')
    : authHeader

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

// Enhanced rate limiting middleware with configurable limits
const requestCounts = new Map()

export function rateLimit(req, res, next) {
  const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id
  const key = `${projectId || 'anonymous'}:${req.ip}`
  
  const now = Date.now()
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15000 // 15 seconds default
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // Max requests per window

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
          window: `${windowMs / 1000} seconds`,
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        })
      }
    }
  }

  // Add rate limit headers
  const record = requestCounts.get(key)
  res.set({
    'X-RateLimit-Limit': maxRequests,
    'X-RateLimit-Remaining': Math.max(0, maxRequests - record.count),
    'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
  })

  next()
}

// API Key validation for webhook endpoints
export function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
  const expectedApiKey = process.env.API_SECRET_KEY

  if (!expectedApiKey) {
    console.warn('API_SECRET_KEY not configured')
    return next() // Allow if not configured (development mode)
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ 
      error: 'Invalid or missing API key',
      required: 'X-API-Key: <api_key> OR Authorization: Bearer <api_key>'
    })
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