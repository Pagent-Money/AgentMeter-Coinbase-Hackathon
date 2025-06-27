#!/usr/bin/env node

const BASE_URL = 'http://localhost:4021'

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`\n🧪 Testing ${name}...`)
    const response = await fetch(`${BASE_URL}${url}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`)
    } else {
      console.log(`❌ ${name}: FAILED`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${JSON.stringify(data)}`)
    }
    
    return { success: response.ok, status: response.status, data }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`)
    console.log(`   Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🚀 AgentMeter Coinbase Hackathon API Tests')
  console.log('=' .repeat(50))

  // Test health endpoints
  await testEndpoint('Health Check', '/api/health')
  await testEndpoint('Demo Health', '/api/demo/health')

  // Test article unlock (should return 402)
  await testEndpoint(
    'Article Unlock (No Payment)', 
    '/api/unlock-article',
    {
      method: 'POST',
      body: JSON.stringify({
        articleId: 'x402-whitepaper',
        projectId: 'demo-project-hackathon-2024'
      })
    }
  )

  // Test article unlock with payment
  await testEndpoint(
    'Article Unlock (With Payment)',
    '/api/unlock-article',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Amount': '0.01'
      },
      body: JSON.stringify({
        articleId: 'x402-whitepaper',
        projectId: 'demo-project-hackathon-2024'
      })
    }
  )

  // Test AI chat
  await testEndpoint(
    'OpenAI Chat',
    '/api/ai-chat',
    {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello, how are you?',
        provider: 'openai',
        projectId: 'demo-project-hackathon-2024'
      })
    }
  )

  await testEndpoint(
    'DeepSeek Chat',
    '/api/ai-chat',
    {
      method: 'POST',
      body: JSON.stringify({
        message: 'What is AgentMeter?',
        provider: 'deepseek',
        projectId: 'demo-project-hackathon-2024'
      })
    }
  )

  // Test ecommerce
  await testEndpoint(
    'Place Order (No Payment)',
    '/api/place-order',
    {
      method: 'POST',
      body: JSON.stringify({
        productId: 'iphone-15-pro',
        price: '999.00',
        projectId: 'demo-project-hackathon-2024'
      })
    }
  )

  await testEndpoint(
    'Place Order (With Payment)',
    '/api/place-order',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Amount': '999.00'
      },
      body: JSON.stringify({
        productId: 'iphone-15-pro',
        price: '999.00',
        projectId: 'demo-project-hackathon-2024'
      })
    }
  )

  // Test AgentMeter tracking
  await testEndpoint(
    'AgentMeter Tracking',
    '/api/agentmeter/track',
    {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'demo-project-hackathon-2024',
        agentId: 'test-agent',
        eventType: 'test_event',
        apiCalls: 1,
        tokensIn: 100,
        tokensOut: 200,
        cost: 0.05
      })
    }
  )

  console.log('\n🎯 All tests completed!')
  console.log('\n📝 Frontend URL: http://localhost:4003/coinbase-hackathon')
  console.log('🔧 Backend URL: http://localhost:4021')
  console.log('\n🚀 Ready for Coinbase Hackathon demo!')
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch')
}

runTests().catch(console.error) 