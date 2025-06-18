// Test script to demonstrate metering events with project secret key
const API_BASE_URL = 'http://localhost:4021/api'

// Example project data (replace with actual project from your dashboard)
const PROJECT_ID = 'proj_123abc'
const PROJECT_SECRET_KEY = 'sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890'

// Function to record a meter event
async function recordMeterEvent(agentId, userId, tokensIn, tokensOut, apiCalls = 1) {
  try {
    const response = await fetch(`${API_BASE_URL}/meter/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROJECT_SECRET_KEY}`,
        'X-Project-ID': PROJECT_ID
      },
      body: JSON.stringify({
        project_id: PROJECT_ID,
        agent_id: agentId,
        user_id: userId,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        api_calls: apiCalls
      })
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Meter event recorded successfully:', {
        eventId: result.event.id,
        totalCost: `$${result.event.total_cost.toFixed(3)}`,
        timestamp: new Date(result.event.timestamp).toLocaleString()
      })
      return result.event
    } else {
      console.error('❌ Failed to record meter event:', result.error)
      return null
    }
  } catch (error) {
    console.error('❌ Error recording meter event:', error.message)
    return null
  }
}

// Function to load meter events
async function loadMeterEvents(projectId, agentId = null, limit = 50) {
  try {
    const params = new URLSearchParams({
      project_id: projectId,
      limit: limit.toString()
    })
    
    if (agentId) {
      params.append('agent_id', agentId)
    }

    const response = await fetch(`${API_BASE_URL}/meter/events?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PROJECT_SECRET_KEY}`,
        'X-Project-ID': PROJECT_ID
      }
    })

    const result = await response.json()
    
    if (result.success) {
      console.log(`📊 Loaded ${result.events.length} meter events`)
      return result.events
    } else {
      console.error('❌ Failed to load meter events:', result.error)
      return []
    }
  } catch (error) {
    console.error('❌ Error loading meter events:', error.message)
    return []
  }
}

// Function to calculate revenue statistics
function calculateRevenueStats(events) {
  const stats = events.reduce((acc, event) => {
    acc.totalApiCalls += event.api_calls
    acc.totalTokensIn += event.tokens_in
    acc.totalTokensOut += event.tokens_out
    acc.totalRequestCost += event.request_cost
    acc.totalTokenCost += event.token_cost
    acc.totalCost += event.total_cost
    return acc
  }, {
    totalApiCalls: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalRequestCost: 0,
    totalTokenCost: 0,
    totalCost: 0
  })

  return {
    ...stats,
    avgCostPerRequest: stats.totalApiCalls > 0 ? stats.totalCost / stats.totalApiCalls : 0,
    avgCostPerToken: (stats.totalTokensIn + stats.totalTokensOut) > 0 ? 
      stats.totalCost / ((stats.totalTokensIn + stats.totalTokensOut) / 1000) : 0
  }
}

// Demo function to simulate different types of AI agent usage
async function runMeteringDemo() {
  console.log('🚀 Starting Metering Demo...\n')

  // Simulate different AI agents and their usage patterns
  const agents = [
    { id: 'chatbot-v1', name: 'Customer Support Chatbot' },
    { id: 'content-gen-v2', name: 'Content Generation Agent' },
    { id: 'data-analyzer-v1', name: 'Data Analysis Agent' },
    { id: 'translation-v1', name: 'Translation Agent' }
  ]

  // Record events for each agent
  for (const agent of agents) {
    console.log(`📝 Recording events for ${agent.name} (${agent.id})...`)
    
    // Simulate multiple requests with different token usage
    const events = [
      { tokensIn: 150, tokensOut: 300, apiCalls: 1, userId: 'user_001' },
      { tokensIn: 200, tokensOut: 450, apiCalls: 1, userId: 'user_002' },
      { tokensIn: 100, tokensOut: 250, apiCalls: 1, userId: 'user_003' },
      { tokensIn: 300, tokensOut: 600, apiCalls: 2, userId: 'user_001' },
      { tokensIn: 180, tokensOut: 380, apiCalls: 1, userId: 'user_004' }
    ]

    for (const event of events) {
      await recordMeterEvent(
        agent.id,
        event.userId,
        event.tokensIn,
        event.tokensOut,
        event.apiCalls
      )
      
      // Small delay to simulate real-world usage
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`✅ Completed events for ${agent.name}\n`)
  }

  // Load and display all events
  console.log('📊 Loading all meter events...')
  const allEvents = await loadMeterEvents(PROJECT_ID)
  
  if (allEvents.length > 0) {
    const stats = calculateRevenueStats(allEvents)
    
    console.log('\n📈 Revenue Statistics:')
    console.log(`   Total API Calls: ${stats.totalApiCalls.toLocaleString()}`)
    console.log(`   Total Input Tokens: ${(stats.totalTokensIn / 1000).toFixed(1)}K`)
    console.log(`   Total Output Tokens: ${(stats.totalTokensOut / 1000).toFixed(1)}K`)
    console.log(`   Request Revenue: $${stats.totalRequestCost.toFixed(3)}`)
    console.log(`   Token Revenue: $${stats.totalTokenCost.toFixed(3)}`)
    console.log(`   Total Revenue: $${stats.totalCost.toFixed(3)}`)
    console.log(`   Avg Cost per Request: $${stats.avgCostPerRequest.toFixed(4)}`)
    console.log(`   Avg Cost per 1K Tokens: $${stats.avgCostPerToken.toFixed(4)}`)
    
    // Show top agents by revenue
    const agentStats = allEvents.reduce((acc, event) => {
      if (!acc[event.agent_id]) {
        acc[event.agent_id] = { calls: 0, revenue: 0 }
      }
      acc[event.agent_id].calls += event.api_calls
      acc[event.agent_id].revenue += event.total_cost
      return acc
    }, {})

    console.log('\n🏆 Top Agents by Revenue:')
    Object.entries(agentStats)
      .sort(([,a], [,b]) => b.revenue - a.revenue)
      .forEach(([agentId, stats], index) => {
        console.log(`   ${index + 1}. ${agentId}: $${stats.revenue.toFixed(3)} (${stats.calls} calls)`)
      })
  }

  console.log('\n🎉 Metering demo completed!')
  console.log('💡 Check your Dashboard to see the real-time updates!')
}

// Run the demo if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runMeteringDemo().catch(console.error)
} else {
  // Browser environment
  window.runMeteringDemo = runMeteringDemo
  console.log('🌐 Metering demo loaded! Run window.runMeteringDemo() to start the demo.')
}

export { recordMeterEvent, loadMeterEvents, calculateRevenueStats, runMeteringDemo } 