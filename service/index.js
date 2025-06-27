const express = require('express')
const cors = require('cors')
const demoRoutes = require('./demo-endpoints.js')

const app = express()
const PORT = process.env.PORT || 4021

// Basic middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:4003',
    /https:\/\/.*\.run\.app$/,  // Allow Cloud Run URLs
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
  ].filter(Boolean),
  credentials: true
}))
app.use(express.json())

// Health check endpoints (both for Cloud Run and our API)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), port: process.env.PORT })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), port: process.env.PORT })
})

// Mount demo routes
app.use('/api', demoRoutes)

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'AgentMeter Coinbase Hackathon Demo Service',
    version: '1.0.0',
    status: 'OK',
    port: process.env.PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/api/health',
      '/api/demo/health', 
      '/api/unlock-article',
      '/api/ai-chat',
      '/api/process-ai-payment',
      '/api/place-order',
      '/api/agentmeter/track'
    ]
  })
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AgentMeter Demo Service starting...`)
  console.log(`📍 Port: ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
  console.log(`🔗 Health checks:`)
  console.log(`   - http://localhost:${PORT}/health`)
  console.log(`   - http://localhost:${PORT}/api/health`)
  console.log(`🏆 Demo endpoints: http://localhost:${PORT}/api/demo/health`)
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`)
})
