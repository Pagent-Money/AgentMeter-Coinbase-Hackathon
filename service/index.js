const express = require('express')
const cors = require('cors')
const demoRoutes = require('./demo-endpoints.js')

const app = express()
const PORT = process.env.PORT || 4021

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4003'],
  credentials: true
}))
app.use(express.json())

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Mount demo routes
app.use('/api', demoRoutes)

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'AgentMeter Coinbase Hackathon Demo Service',
    version: '1.0.0',
    endpoints: [
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
app.listen(PORT, () => {
  console.log(`🚀 AgentMeter Demo Service running on port ${PORT}`)
  console.log(`📝 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🏆 Demo endpoints: http://localhost:${PORT}/api/demo/health`)
})
