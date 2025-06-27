#!/usr/bin/env node

/**
 * Coinbase Hackathon - AgentMeter Live Demos
 * 
 * This script demonstrates the three live demos:
 * 1. Pay-walled Article Unlock
 * 2. Dual AI Chat Agents (OpenAI + DeepSeek)
 * 3. InstantPay Ecommerce
 * 
 * All demos use X402 protocol for payments and AgentMeter for usage tracking.
 */

const axios = require('axios')
const colors = require('colors')

// Configuration
const BASE_URL = process.env.DEMO_BASE_URL || 'http://localhost:4021'
const PROJECT_ID = 'demo-project-hackathon-2024'

// Demo configuration
const DEMOS = {
  article: {
    name: 'Pay-walled Article Unlock',
    endpoint: '/api/unlock-article',
    cost: '0.01 USDC',
    description: 'Unlock X402 whitepaper with micropayment'
  },
  chat: {
    name: 'Dual AI Chat Agents',
    endpoint: '/api/ai-chat',
    cost: 'Variable based on tokens',
    description: 'Chat with OpenAI and DeepSeek simultaneously'
  },
  ecommerce: {
    name: 'InstantPay Ecommerce',
    endpoint: '/api/place-order',
    cost: '$999.00 USDC',
    description: 'Instant product purchase with X402'
  }
}

console.log('🏆 Coinbase Hackathon - AgentMeter Live Demos'.rainbow.bold)
console.log('=' .repeat(60).gray)
console.log()

// Helper functions
function printSection(title) {
  console.log()
  console.log(title.cyan.bold)
  console.log('-'.repeat(title.length).gray)
}

function printStatus(status, message) {
  const statusMap = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  }
  console.log(`${statusMap[status]} ${message}`)
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
    
    if (data) {
      config.data = data
    }
    
    const response = await axios(config)
    return { success: true, data: response.data, status: response.status }
  } catch (error) {
    if (error.response?.status === 402) {
      return { 
        success: false, 
        paymentRequired: true, 
        data: error.response.data,
        status: 402
      }
    }
    return { 
      success: false, 
      error: error.message, 
      data: error.response?.data,
      status: error.response?.status
    }
  }
}

// Demo 1: Pay-walled Article
async function testArticleDemo() {
  printSection('📰 Demo 1: Pay-walled Article Unlock')
  
  printStatus('info', 'Testing article unlock without payment...')
  const withoutPayment = await makeRequest('POST', '/api/unlock-article', {
    articleId: 'x402-whitepaper',
    projectId: PROJECT_ID
  })
  
  if (withoutPayment.paymentRequired) {
    printStatus('success', 'HTTP 402 Payment Required response received ✓')
    console.log('Payment details:'.gray)
    console.log(`  Amount: ${withoutPayment.data.maxAmountRequired} USDC`.gray)
    console.log(`  Network: ${withoutPayment.data.network}`.gray)
    console.log(`  Asset: ${withoutPayment.data.asset}`.gray)
    console.log(`  Pay To: ${withoutPayment.data.payTo}`.gray)
  } else {
    printStatus('error', 'Expected HTTP 402 but got different response')
  }
  
  printStatus('info', 'Testing article unlock with payment...')
  const withPayment = await makeRequest('POST', '/api/unlock-article', {
    articleId: 'x402-whitepaper',
    projectId: PROJECT_ID
  }, {
    'X-Payment-Amount': '0.01'
  })
  
  if (withPayment.success) {
    printStatus('success', 'Article unlocked successfully!')
    console.log(`  Article ID: ${withPayment.data.articleId}`.gray)
    console.log(`  Payment: ${withPayment.data.paymentAmount} USDC`.gray)
    console.log(`  Access: ${withPayment.data.accessGranted ? 'Granted' : 'Denied'}`.gray)
  } else {
    printStatus('error', `Article unlock failed: ${withPayment.error}`)
  }
}

// Demo 2: AI Chat Agents
async function testChatDemo() {
  printSection('🤖 Demo 2: Dual AI Chat Agents')
  
  const testMessage = 'What is x402 protocol?'
  const providers = ['openai', 'deepseek']
  
  for (const provider of providers) {
    printStatus('info', `Testing ${provider.toUpperCase()} agent...`)
    
    // Get AI response
    const aiResponse = await makeRequest('POST', '/api/ai-chat', {
      message: testMessage,
      provider,
      projectId: PROJECT_ID
    })
    
    if (aiResponse.success) {
      console.log(`  Provider: ${provider}`.gray)
      console.log(`  Tokens In: ${aiResponse.data.tokensIn}`.gray)
      console.log(`  Tokens Out: ${aiResponse.data.tokensOut}`.gray)
      
      // Calculate cost
      const apiCost = 0.001
      const inputCost = (aiResponse.data.tokensIn / 1000) * 0.002
      const outputCost = (aiResponse.data.tokensOut / 1000) * 0.004
      const totalCost = apiCost + inputCost + outputCost
      
      console.log(`  Calculated Cost: $${totalCost.toFixed(4)} USDC`.gray)
      
      // Test payment processing
      const paymentResponse = await makeRequest('POST', '/api/process-ai-payment', {
        provider,
        cost: totalCost,
        breakdown: { apiCost, inputCost, outputCost },
        projectId: PROJECT_ID
      }, {
        'X-Payment-Amount': totalCost.toFixed(4)
      })
      
      if (paymentResponse.success) {
        printStatus('success', `${provider.toUpperCase()} payment processed successfully!`)
      } else if (paymentResponse.paymentRequired) {
        printStatus('warning', `Payment required for ${provider}: ${paymentResponse.data.maxAmountRequired} USDC`)
      } else {
        printStatus('error', `Payment failed for ${provider}: ${paymentResponse.error}`)
      }
    } else {
      printStatus('error', `${provider.toUpperCase()} request failed: ${aiResponse.error}`)
    }
    
    console.log()
  }
}

// Demo 3: Ecommerce
async function testEcommerceDemo() {
  printSection('🛒 Demo 3: InstantPay Ecommerce')
  
  printStatus('info', 'Testing product order without payment...')
  const withoutPayment = await makeRequest('POST', '/api/place-order', {
    productId: 'iphone-15-pro',
    price: '999.00',
    projectId: PROJECT_ID
  })
  
  if (withoutPayment.paymentRequired) {
    printStatus('success', 'HTTP 402 Payment Required response received ✓')
    console.log('Payment details:'.gray)
    console.log(`  Amount: ${withoutPayment.data.maxAmountRequired} USDC`.gray)
    console.log(`  Product: iPhone 15 Pro`.gray)
  } else {
    printStatus('error', 'Expected HTTP 402 but got different response')
  }
  
  printStatus('info', 'Testing product order with payment...')
  const withPayment = await makeRequest('POST', '/api/place-order', {
    productId: 'iphone-15-pro',
    price: '999.00',
    projectId: PROJECT_ID
  }, {
    'X-Payment-Amount': '999.00'
  })
  
  if (withPayment.success) {
    printStatus('success', 'Order placed successfully!')
    console.log(`  Order ID: ${withPayment.data.orderId}`.gray)
    console.log(`  Product: ${withPayment.data.productId}`.gray)
    console.log(`  Amount: $${withPayment.data.paymentAmount} USDC`.gray)
    console.log(`  Status: ${withPayment.data.status}`.gray)
    console.log(`  Delivery: ${withPayment.data.estimatedDelivery}`.gray)
  } else {
    printStatus('error', `Order failed: ${withPayment.error}`)
  }
}

// AgentMeter Tracking Test
async function testAgentMeterTracking() {
  printSection('📊 AgentMeter Tracking Test')
  
  const trackingData = {
    projectId: PROJECT_ID,
    agentId: 'demo-test-agent',
    eventType: 'demo_test',
    apiCalls: 3,
    tokensIn: 250,
    tokensOut: 400,
    cost: 0.015,
    metadata: {
      demoType: 'comprehensive_test',
      timestamp: new Date().toISOString()
    }
  }
  
  const tracking = await makeRequest('POST', '/api/agentmeter/track', trackingData)
  
  if (tracking.success) {
    printStatus('success', 'AgentMeter tracking recorded successfully!')
    console.log(`  Tracking ID: ${tracking.data.trackingId}`.gray)
    console.log(`  Project: ${trackingData.projectId}`.gray)
    console.log(`  Agent: ${trackingData.agentId}`.gray)
    console.log(`  Event: ${trackingData.eventType}`.gray)
    console.log(`  Cost: $${trackingData.cost}`.gray)
  } else {
    printStatus('error', `Tracking failed: ${tracking.error}`)
  }
}

// Health Check
async function testHealthCheck() {
  printSection('🔍 System Health Check')
  
  const health = await makeRequest('GET', '/api/demo/health')
  
  if (health.success) {
    printStatus('success', 'All demo endpoints are healthy!')
    console.log('Demo status:'.gray)
    Object.entries(health.data.demos).forEach(([demo, status]) => {
      console.log(`  ${demo}: ${status}`.gray)
    })
    console.log('X402 Configuration:'.gray)
    console.log(`  Network: ${health.data.x402.network}`.gray)
    console.log(`  Payment Address: ${health.data.x402.paymentAddress}`.gray)
    console.log(`  USDC Contract: ${health.data.x402.usdcContract}`.gray)
  } else {
    printStatus('error', `Health check failed: ${health.error}`)
  }
}

// Main demo runner
async function runAllDemos() {
  try {
    console.log('🚀 Starting comprehensive demo test...'.green.bold)
    console.log(`Base URL: ${BASE_URL}`.gray)
    console.log(`Project ID: ${PROJECT_ID}`.gray)
    
    await testHealthCheck()
    await testArticleDemo()
    await testChatDemo()
    await testEcommerceDemo()
    await testAgentMeterTracking()
    
    printSection('🎉 Demo Summary')
    printStatus('success', 'All demos completed successfully!')
    console.log()
    console.log('Frontend URL: http://localhost:3000/coinbase-hackathon'.cyan.bold)
    console.log('Service URL: http://localhost:4021'.cyan.bold)
    console.log()
    console.log('Demo Features:'.yellow.bold)
    Object.entries(DEMOS).forEach(([key, demo]) => {
      console.log(`  ${demo.name}: ${demo.description}`.gray)
      console.log(`    Cost: ${demo.cost}`.gray)
      console.log(`    Endpoint: ${demo.endpoint}`.gray)
      console.log()
    })
    
  } catch (error) {
    printStatus('error', `Demo failed: ${error.message}`)
    console.error(error)
  }
}

// Run demos if called directly
if (require.main === module) {
  runAllDemos()
}

module.exports = {
  runAllDemos,
  testArticleDemo,
  testChatDemo,
  testEcommerceDemo,
  testAgentMeterTracking,
  testHealthCheck
} 