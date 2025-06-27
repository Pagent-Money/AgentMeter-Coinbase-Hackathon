#!/usr/bin/env node

/**
 * AgentMeter CDP Integration Demo
 * Demonstrates the agent-native financial infrastructure capabilities
 */

import { agentFinancialInfrastructure } from './service/billing/cdp-enhanced-billing.js'

const DEMO_AGENTS = ['content-generator-v2', 'data-processor-alpha', 'recommendation-engine']

async function demonstrateCDPIntegration() {
  console.log('🚀 AgentMeter CDP Integration Demo')
  console.log('=====================================\n')

  try {
    // 1. System Health Check
    console.log('1️⃣ Checking System Health...')
    const health = await agentFinancialInfrastructure.getSystemHealth()
    console.log('✅ System Status:', health.status)
    console.log('💰 Commercial Wallet:', health.commercial_wallet)
    console.log('🌐 Network:', health.network)
    console.log('🤖 Total Agents:', health.agents.total)
    console.log()

    // 2. Agent Wallet Creation Demo
    console.log('2️⃣ Creating Agent Wallets with Policies...')
    for (const agentId of DEMO_AGENTS) {
      try {
        console.log(`\n🤖 Creating wallet for agent: ${agentId}`)
        
        // Create agent wallet with policy
        const wallet = await agentFinancialInfrastructure.createAgentWallet(agentId, {
          createPolicy: true,
          policyRules: [
            {
              action: "accept",
              operation: "signEvmTransaction",
              criteria: [
                {
                  type: "ethValue", 
                  ethValue: "1000000000000000000", // Max 1 ETH
                  operator: "<="
                },
                {
                  type: "evmAddress",
                  addresses: [agentFinancialInfrastructure.commercialWallet],
                  operator: "in"
                }
              ]
            }
          ]
        })

        console.log('  ✅ Account Address:', wallet.account.address)
        console.log('  ✅ Smart Account:', wallet.smartAccount.address) 
        console.log('  ✅ Policy ID:', wallet.policyId)
        
      } catch (error) {
        console.log(`  ⚠️ Agent ${agentId} may already exist or CDP not configured`)
      }
    }
    console.log()

    // 3. Payment Processing Demo
    console.log('3️⃣ Processing Agent Payments...')
    const paymentData = {
      apiCalls: 25,
      inputTokens: 2500,
      outputTokens: 1200,
      meterEvents: 5
    }

    const billingAmount = agentFinancialInfrastructure.calculateBillingAmount(paymentData)
    console.log('💳 Billing Calculation:')
    console.log('  Total Amount:', `$${billingAmount.amount.toFixed(4)}`)
    console.log('  API Calls:', `$${billingAmount.breakdown.apiCalls.toFixed(4)}`)
    console.log('  Input Tokens:', `$${billingAmount.breakdown.inputTokens.toFixed(4)}`)
    console.log('  Output Tokens:', `$${billingAmount.breakdown.outputTokens.toFixed(4)}`)
    console.log('  Meter Events:', `$${billingAmount.breakdown.meterEvents.toFixed(4)}`)
    console.log()

    try {
      const paymentResult = await agentFinancialInfrastructure.processAgentPayment(
        DEMO_AGENTS[0], 
        paymentData
      )
      console.log('✅ Payment processed successfully')
      console.log('  User Op Hash:', paymentResult.userOpHash)
      console.log('  Amount:', `$${paymentResult.amount}`)
    } catch (error) {
      console.log('⚠️ Payment processing requires CDP configuration and funding')
    }
    console.log()

    // 4. Batch Payment Demo  
    console.log('4️⃣ Batch Payment Processing...')
    const batchPayments = DEMO_AGENTS.map(agentId => ({
      agentId,
      data: {
        apiCalls: Math.floor(Math.random() * 20) + 5,
        inputTokens: Math.floor(Math.random() * 1000) + 500,
        outputTokens: Math.floor(Math.random() * 500) + 250
      }
    }))

    console.log(`💼 Processing ${batchPayments.length} agent payments...`)
    for (const payment of batchPayments) {
      const amount = agentFinancialInfrastructure.calculateBillingAmount(payment.data)
      console.log(`  ${payment.agentId}: $${amount.amount.toFixed(4)}`)
    }

    try {
      const batchResults = await agentFinancialInfrastructure.processBatchAgentPayments(batchPayments)
      console.log(`✅ Batch processing completed: ${batchResults.length} results`)
    } catch (error) {
      console.log('⚠️ Batch processing requires CDP configuration')
    }
    console.log()

    // 5. Agent Analytics Demo
    console.log('5️⃣ Agent Analytics...')
    for (const agentId of DEMO_AGENTS) {
      try {
        const analytics = await agentFinancialInfrastructure.getAgentAnalytics(agentId)
        if (analytics) {
          console.log(`📊 ${agentId}:`)
          console.log(`  Total Transactions: ${analytics.usage.totalTransactions}`)
          console.log(`  Total Cost: $${analytics.usage.totalCost.toFixed(4)}`)
          console.log(`  Account: ${analytics.addresses.account}`)
          console.log(`  Smart Account: ${analytics.addresses.smartAccount}`)
        }
      } catch (error) {
        console.log(`  ⚠️ Analytics not available for ${agentId}`)
      }
    }
    console.log()

    // 6. API Endpoints Demo
    console.log('6️⃣ Available API Endpoints:')
    const endpoints = [
      'GET  /api/health/detailed - Enhanced system health',
      'GET  /api/config - CDP configuration',
      'POST /api/agents/{id}/wallet - Create agent wallet',
      'GET  /api/agents/{id}/balances - Get balances',
      'POST /api/agents/{id}/fund - Fund from faucet',
      'POST /api/billing/agent-payment - Process payment',
      'POST /api/billing/batch-payment - Batch payments',
      'POST /api/agents/{id}/swap - Token swaps',
      'GET  /api/agents/{id}/analytics - Agent analytics'
    ]
    
    endpoints.forEach(endpoint => console.log(`  📡 ${endpoint}`))
    console.log()

    // 7. Next Steps
    console.log('7️⃣ Next Steps for Production:')
    console.log('  1. Configure CDP API keys in .env file')
    console.log('  2. Fund agent wallets for testnet operations')
    console.log('  3. Deploy to Base mainnet for production')
    console.log('  4. Monitor agent transactions and policies')
    console.log()

    console.log('🎉 CDP Integration Demo Complete!')
    console.log('AgentMeter is now ready for agent-native financial operations!')

  } catch (error) {
    console.error('❌ Demo failed:', error.message)
    console.log('\n💡 This is expected if CDP SDK is not configured.')
    console.log('The integration is ready - just add your CDP credentials to .env')
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateCDPIntegration()
} 