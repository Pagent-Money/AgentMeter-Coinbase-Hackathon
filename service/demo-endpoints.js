const express = require('express')
const router = express.Router()
const { processX402Payment, generateX402PaymentRequest, getMockWallet } = require('./billing/x402-real-payment')

// Mock AI responses for demo purposes
const AI_RESPONSES = {
  openai: {
    'hello': 'Hello! I\'m OpenAI\'s GPT model. How can I assist you today?',
    'what is x402': 'X402 is an innovative payment protocol that enables HTTP 402 "Payment Required" responses for instant, agent-native transactions using blockchain technology.',
    'explain agentmeter': 'AgentMeter is a usage-based billing platform that tracks API calls, token usage, and costs for AI agents, enabling precise metering and revenue optimization.',
    'default': 'I\'m OpenAI\'s language model. I can help you with a wide variety of tasks including writing, analysis, coding, and creative projects. What would you like to know?'
  },
  deepseek: {
    'hello': 'Greetings! I\'m DeepSeek, an AI assistant focused on reasoning and problem-solving. What can I help you explore today?',
    'what is x402': 'X402 represents a paradigm shift toward autonomous payment systems, leveraging HTTP status codes to create seamless machine-to-machine transactions with instant settlement.',
    'explain agentmeter': 'AgentMeter provides comprehensive usage analytics and billing infrastructure, allowing businesses to monetize AI services with granular tracking of computational resources and API interactions.',
    'default': 'I\'m DeepSeek, designed for deep reasoning and analytical tasks. I excel at breaking down complex problems and providing structured solutions. How may I assist your thinking process?'
  }
}

// Health check for demo endpoints
router.get('/demo/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Coinbase Hackathon Demo Endpoints Active',
    endpoints: ['unlock-article', 'ai-chat', 'process-ai-payment', 'place-order', 'agentmeter/track'],
    timestamp: new Date().toISOString() 
  })
})

// Demo 1: Pay-walled Article Unlock
router.post('/unlock-article', async (req, res) => {
  try {
    const { articleId, projectId } = req.body
    const paymentAmount = req.headers['x-payment-amount']
    
    // Check if payment is provided
    if (!paymentAmount || parseFloat(paymentAmount) < 0.01) {
      return res.status(402).json({
        maxAmountRequired: "0.01",
        resource: "/api/unlock-article",
        description: "Access to X402 whitepaper requires payment.",
        payTo: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        asset: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC on Sepolia
        network: "sepolia"
      })
    }

    // Simulate payment verification
    console.log(`Processing article unlock payment: ${paymentAmount} USDC for article ${articleId}`)
    
    // Mock AgentMeter tracking
    const trackingData = {
      projectId,
      agentId: 'article-unlock-agent',
      eventType: 'article_unlock',
      apiCalls: 1,
      cost: parseFloat(paymentAmount),
      metadata: { articleId }
    }
    
    console.log('AgentMeter tracking:', trackingData)

    // Return success with article access
    res.json({
      success: true,
      articleId,
      accessGranted: true,
      paymentAmount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Article unlock error:', error)
    res.status(500).json({ error: 'Failed to process article unlock' })
  }
})

// Demo 2: AI Chat Processing
router.post('/ai-chat', async (req, res) => {
  try {
    const { message, provider, projectId } = req.body
    
    if (!message || !provider) {
      return res.status(400).json({ error: 'Message and provider required' })
    }

    // Get response based on provider and message
    const responses = AI_RESPONSES[provider]
    const messageKey = message.toLowerCase()
    
    let response = responses.default
    for (const key of Object.keys(responses)) {
      if (messageKey.includes(key)) {
        response = responses[key]
        break
      }
    }

    // Mock token calculation (simulate realistic token counts)
    const tokensIn = Math.floor(message.length / 4) + Math.floor(Math.random() * 50) + 50
    const tokensOut = Math.floor(response.length / 4) + Math.floor(Math.random() * 100) + 100

    console.log(`${provider.toUpperCase()} processing: "${message}" -> ${tokensIn} in, ${tokensOut} out tokens`)

    // Return AI response with token metrics
    res.json({
      provider,
      content: response,
      tokensIn,
      tokensOut,
      timestamp: new Date().toISOString(),
      projectId
    })

  } catch (error) {
    console.error('AI chat error:', error)
    res.status(500).json({ error: `Failed to process ${req.body.provider} chat` })
  }
})

// Demo 2: Process AI Payment
router.post('/process-ai-payment', async (req, res) => {
  try {
    const { provider, cost, breakdown, projectId } = req.body
    const paymentAmount = req.headers['x-payment-amount']
    
    // Check if payment matches calculated cost
    if (!paymentAmount || Math.abs(parseFloat(paymentAmount) - cost) > 0.0001) {
      return res.status(402).json({
        maxAmountRequired: cost.toFixed(4),
        resource: "/api/process-ai-payment",
        description: `Payment required for ${provider} AI processing.`,
        payTo: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        asset: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        network: "sepolia",
        breakdown
      })
    }

    console.log(`Processing AI payment: ${paymentAmount} USDC for ${provider}`)
    console.log('Cost breakdown:', breakdown)

    // Return payment confirmation
    res.json({
      success: true,
      provider,
      paymentAmount,
      cost,
      breakdown,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI payment error:', error)
    res.status(500).json({ error: 'Failed to process AI payment' })
  }
})

// Demo 3: Place Ecommerce Order
router.post('/place-order', async (req, res) => {
  try {
    const { productId, price, projectId } = req.body
    const paymentAmount = req.headers['x-payment-amount']
    
    // Check if payment is provided
    if (!paymentAmount || parseFloat(paymentAmount) !== parseFloat(price)) {
      return res.status(402).json({
        maxAmountRequired: price,
        resource: "/api/place-order",
        description: `Payment required for product purchase.`,
        payTo: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        asset: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        network: "sepolia"
      })
    }

    // Generate order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    console.log(`Processing order: ${orderId} for product ${productId} - ${paymentAmount} USDC`)
    
    // Mock AgentMeter tracking
    const trackingData = {
      projectId,
      agentId: 'ecommerce-agent',
      eventType: 'order_placed',
      cost: parseFloat(paymentAmount),
      metadata: { productId, orderId }
    }
    
    console.log('AgentMeter tracking:', trackingData)

    // Generate gift card code
    const generateGiftCardCode = () => {
      const randomCode = Math.random().toString(36).substr(2, 12).toUpperCase()
      return `GIFT-${randomCode}`
    }

    const giftCardCode = generateGiftCardCode()
    const giftCardValue = paymentAmount // The gift card value matches the payment amount
    
    console.log(`Generated gift card: ${giftCardCode} with value ${giftCardValue} USDC`)

    // Return order confirmation with gift card
    res.json({
      success: true,
      orderId,
      productId,
      paymentAmount,
      status: 'confirmed',
      giftCard: {
        code: giftCardCode,
        value: giftCardValue,
        currency: 'USDC',
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        status: 'active'
      },
      message: `Your gift card ${giftCardCode} has been generated and is ready to use!`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Order placement error:', error)
    res.status(500).json({ error: 'Failed to process order' })
  }
})

// AgentMeter Tracking Endpoint
router.post('/agentmeter/track', async (req, res) => {
  try {
    const { 
      projectId, 
      agentId, 
      eventType, 
      apiCalls = 0, 
      tokensIn = 0, 
      tokensOut = 0, 
      cost = 0, 
      metadata = {} 
    } = req.body

    // Mock AgentMeter tracking
    const trackingRecord = {
      id: `tracking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      agentId,
      eventType,
      apiCalls,
      tokensIn,
      tokensOut,
      cost,
      metadata,
      timestamp: new Date().toISOString()
    }

    console.log('AgentMeter tracking recorded:', trackingRecord)

    res.json({
      success: true,
      trackingId: trackingRecord.id,
      recorded: trackingRecord
    })

  } catch (error) {
    console.error('AgentMeter tracking error:', error)
    res.status(500).json({ error: 'Failed to record AgentMeter tracking' })
  }
})

// Health check endpoint
router.get('/api/demo/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    demos: {
      'pay-walled-article': 'available',
      'ai-chat-agents': 'available',
      'instant-ecommerce': 'available'
    },
    x402: {
      network: 'sepolia',
      paymentAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    }
  })
})

// Dashboard API endpoints for AgentMeter integration

// Projects endpoints
router.get('/projects', (req, res) => {
  // Mock projects data
  const projects = [
    {
      id: 'hackathon-demo',
      name: 'Coinbase Hackathon Demo',
      description: 'AgentMeter + X402 integration demo for Coinbase Hackathon',
      status: 'active',
      created_at: '2025-06-26T00:00:00Z',
      secret_key: 'sk_hackathon_demo_12345',
      settings: {
        pricing: {
          api_request_price: 0.001,
          input_token_price: 0.0001,
          output_token_price: 0.0002
        }
      }
    },
    {
      id: 'x402-protocol-demo',
      name: 'X402 Protocol Demo',
      description: 'Demonstrating HTTP 402 payment flows with USDC',
      status: 'active',
      created_at: '2025-06-25T00:00:00Z',
      secret_key: 'sk_x402_demo_67890',
      settings: {
        pricing: {
          api_request_price: 0.005,
          input_token_price: 0.0002,
          output_token_price: 0.0004
        }
      }
    }
  ]

  res.json({
    success: true,
    projects
  })
})

router.post('/projects', (req, res) => {
  const { name, description, settings } = req.body
  const newProject = {
    id: `project_${Date.now()}`,
    name,
    description,
    status: 'active',
    created_at: new Date().toISOString(),
    secret_key: `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    settings: settings || {
      pricing: {
        api_request_price: 0.001,
        input_token_price: 0.0001,
        output_token_price: 0.0002
      }
    }
  }

  res.json({
    success: true,
    project: newProject
  })
})

// Meter events endpoint
router.get('/meter/events', (req, res) => {
  const { project_id } = req.query
  
  // Mock meter events data
  const events = [
    {
      id: 'evt_1',
      project_id: project_id || 'hackathon-demo',
      agent_id: 'article-unlock-agent',
      event_type: 'article_unlock',
      api_calls: 1,
      tokens_in: 0,
      tokens_out: 0,
      request_cost: 0.01,
      token_cost: 0,
      total_cost: 0.01,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      metadata: { articleId: 'x402-whitepaper' }
    },
    {
      id: 'evt_2',
      project_id: project_id || 'hackathon-demo',
      agent_id: 'openai-chat-agent',
      event_type: 'chat_completion',
      api_calls: 1,
      tokens_in: 245,
      tokens_out: 387,
      request_cost: 0.001,
      token_cost: 0.1022,
      total_cost: 0.1032,
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      metadata: { provider: 'openai' }
    },
    {
      id: 'evt_3',
      project_id: project_id || 'hackathon-demo',
      agent_id: 'ecommerce-agent',
      event_type: 'order_placed',
      api_calls: 1,
      tokens_in: 0,
      tokens_out: 0,
      request_cost: 0.01,
      token_cost: 0,
      total_cost: 0.01,
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      metadata: { productId: 'apple-gift-card', orderId: 'ORDER_123456' }
    },
    {
      id: 'evt_4',
      project_id: project_id || 'hackathon-demo',
      agent_id: 'deepseek-chat-agent',
      event_type: 'chat_completion',
      api_calls: 1,
      tokens_in: 198,
      tokens_out: 445,
      request_cost: 0.001,
      token_cost: 0.1088,
      total_cost: 0.1098,
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      metadata: { provider: 'deepseek' }
    }
  ]

  res.json({
    success: true,
    events
  })
})

// Billing records endpoint
router.get('/billing/records', (req, res) => {
  const { project_id } = req.query
  
  // Mock billing records
  const records = [
    {
      id: 'bill_1',
      project_id: project_id || 'hackathon-demo',
      period_start: '2025-06-01T00:00:00Z',
      period_end: '2025-06-30T23:59:59Z',
      total_amount: 12.45,
      status: 'paid',
      created_at: '2025-06-01T00:00:00Z'
    },
    {
      id: 'bill_2',
      project_id: project_id || 'hackathon-demo',
      period_start: '2025-05-01T00:00:00Z',
      period_end: '2025-05-31T23:59:59Z',
      total_amount: 8.76,
      status: 'paid',
      created_at: '2025-05-01T00:00:00Z'
    }
  ]

  res.json({
    success: true,
    records
  })
})

// Real X402 Payment Processing Endpoint
router.post('/process-real-x402-payment', async (req, res) => {
  try {
    const { amount, resource, description, useRealPayment = false } = req.body
    
    if (!useRealPayment) {
      // Fall back to simulated payment
      return res.json({
        success: true,
        simulated: true,
        amount,
        message: 'Simulated payment processed successfully',
        timestamp: new Date().toISOString()
      })
    }

    // Check for real payment parameters
    const { fromAddress, privateKey } = req.body
    
    console.log('Real X402 payment request:', { 
      fromAddress, 
      hasPrivateKey: !!privateKey, 
      privateKeyType: typeof privateKey,
      privateKeyStart: privateKey ? String(privateKey).substring(0, 10) : 'undefined'
    })
    
    if (!fromAddress || !privateKey) {
      // Return X402 payment request
      return res.status(402).json(
        generateX402PaymentRequest(amount, resource || '/api/process-real-x402-payment', description)
      )
    }

    // Process real blockchain payment
    const paymentResult = await processX402Payment({
      fromAddress,
      privateKey,
      amount,
      resource: resource || '/api/process-real-x402-payment'
    })

    if (paymentResult.success) {
      res.json({
        success: true,
        real: true,
        txHash: paymentResult.txHash,
        blockNumber: paymentResult.blockNumber,
        amount,
        network: 'sepolia',
        timestamp: paymentResult.timestamp
      })
    } else {
      res.status(400).json({
        success: false,
        error: paymentResult.error,
        timestamp: paymentResult.timestamp
      })
    }

  } catch (error) {
    console.error('Real X402 payment error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process real X402 payment',
      details: error.message
    })
  }
})

// Get Mock Wallet for Testing
router.get('/mock-wallet', (req, res) => {
  const wallet = getMockWallet()
  res.json({
    success: true,
    wallet: {
      address: wallet.address,
      // Don't expose private key in real applications!
      // For hackathon demo purposes, we'll expose it in development
      privateKey: wallet.privateKey, // Always show for demo purposes
      balance: wallet.balance,
      network: 'sepolia',
      note: 'This is a test wallet for Sepolia testnet only. Do not use for real funds!'
    }
  })
})

module.exports = router 