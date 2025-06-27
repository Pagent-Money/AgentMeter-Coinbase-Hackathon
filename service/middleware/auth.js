// Authentication middleware for project secret keys and API key pairs
import { supabase, dbHelpers } from '../config/supabase.js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(process.cwd(), 'service', '.env') })

// Validate legacy project secret key (backward compatibility)
async function validateProjectSecret(projectId, secretKey) {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        commercial_accounts!inner(id, email, status, subscription_tier)
      `)
      .eq('id', projectId)
      .eq('secret_key', secretKey)
      .eq('status', 'active')
      .eq('commercial_accounts.status', 'active')
      .single()

    if (error) {
      console.error('Database error during legacy authentication:', error)
      return { valid: false, error: 'Invalid project ID or secret key' }
    }

    if (!project) {
      return { valid: false, error: 'Invalid project ID or secret key' }
    }

    return { 
      valid: true, 
      project,
      account: project.commercial_accounts,
      authMethod: 'legacy_secret'
    }
  } catch (error) {
    console.error('Error validating project secret:', error)
    return { valid: false, error: 'Invalid project ID or secret key' }
  }
}

// Validate API key pair (new authentication method)
async function validateApiKey(apiKey) {
  try {
    const { data, error } = await supabase
      .rpc('authenticate_api_key', { p_api_key: apiKey })

    if (error) {
      console.error('Database error during API key authentication:', error)
      return { valid: false, error: 'Invalid API key' }
    }

    if (!data || data.length === 0 || !data[0].is_valid) {
      return { valid: false, error: 'Invalid or expired API key' }
    }

    const authData = data[0]

    // Get full project and account details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        commercial_accounts!inner(id, email, status, subscription_tier)
      `)
      .eq('id', authData.project_id)
      .eq('status', 'active')
      .eq('commercial_accounts.status', 'active')
      .single()

    if (projectError || !project) {
      return { valid: false, error: 'Project not found or inactive' }
    }

    return { 
      valid: true, 
      project,
      account: project.commercial_accounts,
      permissions: authData.permissions,
      authMethod: 'api_key'
    }
  } catch (error) {
    console.error('Error validating API key:', error)
    return { valid: false, error: 'Invalid API key' }
  }
}

// Session token validation for frontend authentication
async function validateSessionToken(sessionToken) {
  try {
    // Extract account ID from session token
    // Format: session_{accountId}_{timestamp}
    const parts = sessionToken.split('_')
    if (parts.length !== 3 || parts[0] !== 'session') {
      return { valid: false, error: 'Invalid session token format' }
    }

    const accountId = parts[1]
    const timestamp = parseInt(parts[2])
    
    // Check if token is not too old (24 hours = 86400000 ms)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (now - timestamp > maxAge) {
      return { valid: false, error: 'Session token expired' }
    }

    // Get account from database
    const account = await dbHelpers.getCommercialAccount(accountId)
    if (!account) {
      return { valid: false, error: 'Account not found' }
    }

    if (account.status !== 'active') {
      return { valid: false, error: 'Account is not active' }
    }

    return {
      valid: true,
      account: account,
      authMethod: 'session'
    }
  } catch (error) {
    console.error('Session token validation error:', error)
    return { valid: false, error: 'Session validation failed' }
  }
}

// Enhanced authentication middleware supporting both methods
function authenticateProject(req, res, next) {
  // Skip authentication for non-metering endpoints and public endpoints
  if (!req.path.startsWith('/api/meter') && !req.path.startsWith('/api/projects')) {
    return next()
  }

  const authHeader = req.headers.authorization || req.headers['x-project-secret']
  const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id

  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Missing authorization header',
      required: 'Authorization: Bearer <api_key_or_secret_key>'
    })
  }

  // Extract key from Authorization header
  const key = authHeader.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '')
    : authHeader

  if (!key) {
    return res.status(401).json({ 
      error: 'Invalid authorization header format',
      format: 'Authorization: Bearer <api_key_or_secret_key>'
    })
  }

  // Determine authentication method based on key format
  const isApiKey = key.startsWith('pk_') || key.startsWith('sk_')
  const isSessionToken = key.startsWith('session_')
  
  if (isSessionToken) {
    // Session token authentication for frontend
    validateSessionToken(key)
      .then(({ valid, account, error }) => {
        if (!valid) {
          return res.status(401).json({ error })
        }

        // Add authentication info to request
        req.account = account
        req.permissions = { read: true, write: true, admin: true } // Full access for account owner
        req.authMethod = 'session'
        next()
      })
      .catch(error => {
        console.error('Session authentication error:', error)
        res.status(500).json({ error: 'Authentication service error' })
      })
  } else if (isApiKey) {
    // New API key authentication
    validateApiKey(key)
      .then(({ valid, project, account, permissions, error, authMethod }) => {
        if (!valid) {
          return res.status(401).json({ error })
        }

        // Add authentication info to request
        req.project = project
        req.account = account
        req.permissions = permissions
        req.authMethod = authMethod
        next()
      })
      .catch(error => {
        console.error('API key authentication error:', error)
        res.status(500).json({ error: 'Authentication service error' })
      })
  } else {
    // Legacy secret key authentication
    if (!projectId) {
      return res.status(401).json({ 
        error: 'Missing project ID for legacy authentication',
        required: 'X-Project-ID: <project_id>'
      })
    }

    validateProjectSecret(projectId, key)
      .then(({ valid, project, account, error, authMethod }) => {
        if (!valid) {
          return res.status(401).json({ error })
        }

        // Add authentication info to request
        req.project = project
        req.account = account
        req.permissions = { read: true, write: true, admin: true } // Legacy keys have full access
        req.authMethod = authMethod
        next()
      })
      .catch(error => {
        console.error('Legacy authentication error:', error)
        res.status(500).json({ error: 'Authentication service error' })
      })
  }
}

// Permission checking middleware
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.permissions) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!req.permissions[permission]) {
      return res.status(403).json({ 
        error: `Insufficient permissions. Required: ${permission}`,
        available: Object.keys(req.permissions).filter(p => req.permissions[p])
      })
    }

    next()
  }
}

// Optional authentication middleware (for endpoints that can work without auth)
function optionalAuthenticateProject(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-project-secret']
  
  if (!authHeader) {
    return next()
  }

  const key = authHeader.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '')
    : authHeader

  if (!key) {
    return next()
  }

  const isApiKey = key.startsWith('pk_') || key.startsWith('sk_')
  const isSessionToken = key.startsWith('session_')
  
  if (isSessionToken) {
    validateSessionToken(key)
      .then(({ valid, account }) => {
        if (valid) {
          req.account = account
          req.permissions = { read: true, write: true, admin: true }
          req.authMethod = 'session'
        }
        next()
      })
      .catch(error => {
        console.error('Optional session authentication error:', error)
        next()
      })
  } else if (isApiKey) {
    validateApiKey(key)
      .then(({ valid, project, account, permissions, authMethod }) => {
        if (valid) {
          req.project = project
          req.account = account
          req.permissions = permissions
          req.authMethod = authMethod
        }
        next()
      })
      .catch(error => {
        console.error('Optional API key authentication error:', error)
        next()
      })
  } else {
    const projectId = req.headers['x-project-id'] || req.body.project_id || req.query.project_id
    if (!projectId) {
      return next()
    }

    validateProjectSecret(projectId, key)
      .then(({ valid, project, account, authMethod }) => {
        if (valid) {
          req.project = project
          req.account = account
          req.permissions = { read: true, write: true, admin: true }
          req.authMethod = authMethod
        }
        next()
      })
      .catch(error => {
        console.error('Optional legacy authentication error:', error)
        next()
      })
  }
}

// Enhanced rate limiting middleware with account-based limits
const requestCounts = new Map()

function rateLimit(req, res, next) {
  const accountId = req.account?.id
  const projectId = req.project?.id || req.headers['x-project-id'] || req.body.project_id || req.query.project_id
  const key = `${accountId || projectId || 'anonymous'}:${req.ip}`
  
  const now = Date.now()
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15000 // 15 seconds default
  
  // Different limits based on subscription tier
  let maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  if (req.account?.subscription_tier) {
    const tierLimits = {
      free: 50,
      starter: 100,
      professional: 500,
      enterprise: 1000
    }
    maxRequests = tierLimits[req.account.subscription_tier] || maxRequests
  }

  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs })
  } else {
    const record = requestCounts.get(key)
    
    if (now > record.resetTime) {
      record.count = 1
      record.resetTime = now + windowMs
    } else {
      record.count++
      
      if (record.count > maxRequests) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          limit: maxRequests,
          window: `${windowMs / 1000} seconds`,
          tier: req.account?.subscription_tier || 'free',
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
    'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
    'X-RateLimit-Tier': req.account?.subscription_tier || 'free'
  })

  next()
}

// API Key validation for webhook endpoints
function validateWebhookApiKey(req, res, next) {
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

export { 
  validateProjectSecret, 
  validateApiKey as validateApiKeyPair, 
  validateWebhookApiKey,
  authenticateProject,
  requirePermission,
  optionalAuthenticateProject,
  rateLimit
} 