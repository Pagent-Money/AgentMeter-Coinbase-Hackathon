import { CdpClient } from '@coinbase/cdp-sdk'
import { paymentMiddleware } from 'x402-express'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia, base } from 'viem/chains'
import { parseEther, parseUnits } from 'viem'

// Coinbase Commercial Wallet Configuration
export const COINBASE_COMMERCIAL_WALLET_ADDRESS = '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5'
const X402_SECRET_KEY = process.env.X402_SECRET_KEY || 'd191100c-e585-4d9c-8d21-7e9671463eea'
const X402_CLIENT_API_KEY = process.env.X402_CLIENT_API_KEY || 'aOVSSsLeCzkYw3pmXC2GEPD9zXvnbkwz'

// Network configuration
const NETWORK = process.env.X402_NETWORK || 'base-sepolia'
const CHAIN = NETWORK === 'base' ? base : baseSepolia

/**
 * Enhanced Project-Native Financial Infrastructure
 * Combines CDP SDK + X402 Protocol for comprehensive project billing
 */
export class AgentMeterFinancialInfrastructure {
  constructor() {
    this.cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET
    })
    this.commercialWallet = COINBASE_COMMERCIAL_WALLET_ADDRESS
    this.network = NETWORK
    this.projectWallets = new Map() // Cache for project wallets
    this.projectPolicies = new Map() // Cache for project policies
  }

  /**
   * Project Wallet Management
   */
  async createProjectWallet(projectId, options = {}) {
    try {
      console.log(`Creating CDP wallet for project: ${projectId}`)
      
      // Create policy for project if specified
      let policyId = null
      if (options.createPolicy) {
        policyId = await this.createProjectPolicy(projectId, options.policyRules || [])
      }

      // Create CDP account for the project
      const account = await this.cdp.evm.createAccount({
        name: `project-${projectId}`,
        ...(policyId && { accountPolicy: policyId })
      })

      console.log(`Created CDP account for project ${projectId}: ${account.address}`)

      // Create smart account for gasless transactions
      const smartAccount = await this.cdp.evm.createSmartAccount({
        name: `smart-project-${projectId}`,
        owner: account
      })

      console.log(`Created smart account for project ${projectId}: ${smartAccount.address}`)

      const projectWallet = {
        projectId,
        account,
        smartAccount,
        policyId,
        created: new Date().toISOString(),
        usage: {
          totalTransactions: 0,
          totalCost: 0,
          agentCount: 0,
          lastActivity: null
        }
      }

      // Cache the wallet
      this.projectWallets.set(projectId, projectWallet)

      return projectWallet
    } catch (error) {
      console.error(`Failed to create project wallet for ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Create governance policy for a project
   */
  async createProjectPolicy(projectId, customRules = []) {
    try {
      const defaultRules = [
        {
          action: "accept",
          operation: "signEvmTransaction",
          criteria: [
            {
              type: "ethValue",
              ethValue: "10000000000000000000", // Max 10 ETH per transaction for project
              operator: "<="
            },
            {
              type: "evmAddress",
              addresses: [this.commercialWallet], // Only allow payments to our wallet
              operator: "in"
            }
          ]
        }
      ]

      const rules = customRules.length > 0 ? customRules : defaultRules

      const policy = await this.cdp.policies.createPolicy({
        policy: {
          scope: "account",
          description: `Project ${projectId} spending and interaction policy`,
          rules
        }
      })

      console.log(`Created policy for project ${projectId}: ${policy.id}`)
      this.projectPolicies.set(projectId, policy)

      return policy.id
    } catch (error) {
      console.error(`Failed to create policy for project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Get or create project wallet
   */
  async getOrCreateProjectWallet(projectId, options = {}) {
    // Check cache first
    if (this.projectWallets.has(projectId)) {
      return this.projectWallets.get(projectId)
    }

    // Try to get existing account from CDP
    try {
      const account = await this.cdp.evm.getOrCreateAccount({
        name: `project-${projectId}`
      })

      const smartAccount = await this.cdp.evm.getOrCreateSmartAccount({
        name: `smart-project-${projectId}`,
        owner: account
      })

      const projectWallet = {
        projectId,
        account,
        smartAccount,
        policyId: null, // Will be populated if policy exists
        created: new Date().toISOString(),
        usage: {
          totalTransactions: 0,
          totalCost: 0,
          agentCount: 0,
          lastActivity: null
        }
      }

      this.projectWallets.set(projectId, projectWallet)
      return projectWallet

    } catch (error) {
      // If account doesn't exist, create new one
      return await this.createProjectWallet(projectId, options)
    }
  }

  /**
   * Process project payment for agent usage using smart account (gasless)
   */
  async processAgentPayment(projectId, agentId, paymentData) {
    try {
      const projectWallet = await this.getOrCreateProjectWallet(projectId)
      const { smartAccount } = projectWallet

      // Calculate payment amount based on usage
      const billingAmount = this.calculateBillingAmount(paymentData)

      // Use smart account for gasless payment
      const userOp = await smartAccount.sendUserOperation({
        network: this.network,
        calls: [
          {
            to: this.commercialWallet,
            value: parseEther(billingAmount.amount.toString()),
            data: '0x' // Simple ETH transfer
          }
        ]
        // Built-in gasless paymaster on Base Sepolia
      })

      // Update project usage stats
      projectWallet.usage.totalTransactions += 1
      projectWallet.usage.totalCost += billingAmount.amount
      projectWallet.usage.lastActivity = new Date().toISOString()
      
      // Track unique agents for this project
      if (!projectWallet.agents) {
        projectWallet.agents = new Set()
      }
      projectWallet.agents.add(agentId)
      projectWallet.usage.agentCount = projectWallet.agents.size

      console.log(`Agent ${agentId} payment processed: ${userOp.userOpHash}`)

      return {
        success: true,
        userOpHash: userOp.userOpHash,
        amount: billingAmount.amount,
        agentId,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error(`Failed to process payment for agent ${agentId}:`, error)
      throw error
    }
  }

  /**
   * Batch process multiple agent payments
   */
  async processBatchAgentPayments(payments) {
    try {
      const results = []
      
      // Group payments by agent for optimization
      const paymentsByAgent = new Map()
      payments.forEach(payment => {
        const agentId = payment.agentId
        if (!paymentsByAgent.has(agentId)) {
          paymentsByAgent.set(agentId, [])
        }
        paymentsByAgent.get(agentId).push(payment)
      })

      // Process each agent's payments in batch
      for (const [agentId, agentPayments] of paymentsByAgent) {
        const agentWallet = await this.getOrCreateAgentWallet(agentId)
        const { smartAccount } = agentWallet

        // Create batch calls for this agent
        const calls = agentPayments.map(payment => {
          const amount = this.calculateBillingAmount(payment.data)
          return {
            to: this.commercialWallet,
            value: parseEther(amount.amount.toString()),
            data: '0x'
          }
        })

        // Execute batch transaction
        const userOp = await smartAccount.sendUserOperation({
          network: this.network,
          calls
        })

        // Update usage stats
        const totalAmount = agentPayments.reduce((sum, p) => {
          return sum + this.calculateBillingAmount(p.data).amount
        }, 0)

        agentWallet.usage.totalTransactions += agentPayments.length
        agentWallet.usage.totalCost += totalAmount
        agentWallet.usage.lastActivity = new Date().toISOString()

        results.push({
          agentId,
          userOpHash: userOp.userOpHash,
          paymentsCount: agentPayments.length,
          totalAmount,
          timestamp: new Date().toISOString()
        })
      }

      return results

    } catch (error) {
      console.error('Failed to process batch payments:', error)
      throw error
    }
  }



  /**
   * Get project wallet balances
   */
  async getProjectBalances(projectId) {
    try {
      const projectWallet = await this.getOrCreateProjectWallet(projectId)
      const { account, smartAccount } = projectWallet

      const [accountBalances, smartAccountBalances] = await Promise.all([
        account.listTokenBalances({ network: this.network }),
        smartAccount.listTokenBalances({ network: this.network })
      ])

      return {
        projectId,
        account: {
          address: account.address,
          balances: accountBalances
        },
        smartAccount: {
          address: smartAccount.address,
          balances: smartAccountBalances
        }
      }
    } catch (error) {
      console.error(`Failed to get balances for project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Fund project from testnet faucet (for development)
   */
  async fundProjectFromFaucet(projectId, token = 'eth') {
    try {
      if (this.network !== 'base-sepolia') {
        throw new Error('Faucet only available on testnet')
      }

      const projectWallet = await this.getOrCreateProjectWallet(projectId)
      const { account } = projectWallet

      const faucetResult = await this.cdp.evm.requestFaucet({
        address: account.address,
        network: this.network,
        token
      })

      console.log(`Project ${projectId} funded from faucet: ${faucetResult.transactionHash}`)

      return faucetResult
    } catch (error) {
      console.error(`Failed to fund project ${projectId} from faucet:`, error)
      throw error
    }
  }

  /**
   * Calculate billing amount (existing logic)
   */
  calculateBillingAmount(usageData) {
    let totalAmount = 0
    
    // API request charges
    if (usageData.apiCalls) {
      totalAmount += usageData.apiCalls * 0.001
    }
    
    // Token charges
    if (usageData.inputTokens) {
      totalAmount += (usageData.inputTokens / 1000) * 0.002
    }
    
    if (usageData.outputTokens) {
      totalAmount += (usageData.outputTokens / 1000) * 0.004
    }
    
    // Meter event charges
    if (usageData.meterEvents) {
      totalAmount += usageData.meterEvents * 0.005
    }
    
    return {
      amount: totalAmount,
      currency: 'USD',
      breakdown: {
        apiCalls: usageData.apiCalls ? usageData.apiCalls * 0.001 : 0,
        inputTokens: usageData.inputTokens ? (usageData.inputTokens / 1000) * 0.002 : 0,
        outputTokens: usageData.outputTokens ? (usageData.outputTokens / 1000) * 0.004 : 0,
        meterEvents: usageData.meterEvents ? usageData.meterEvents * 0.005 : 0
      }
    }
  }

  /**
   * Get project analytics
   */
  async getProjectAnalytics(projectId) {
    try {
      const projectWallet = this.projectWallets.get(projectId)
      if (!projectWallet) {
        return null
      }

      const balances = await this.getProjectBalances(projectId)

      return {
        projectId,
        usage: projectWallet.usage,
        balances: balances,
        policy: this.projectPolicies.get(projectId),
        addresses: {
          account: projectWallet.account.address,
          smartAccount: projectWallet.smartAccount.address
        },
        agents: projectWallet.agents ? Array.from(projectWallet.agents) : [],
        created: projectWallet.created
      }
    } catch (error) {
      console.error(`Failed to get analytics for project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Create X402 middleware with CDP integration
   */
  createEnhancedX402Middleware() {
    const billingConfig = {
      'POST /api/billing/agent-payment': { price: '$0.001', network: this.network },
      'POST /api/billing/batch-payment': { price: '$0.005', network: this.network },
      'POST /api/meter-events': { price: '$0.001', network: this.network },
      'GET /api/analytics/premium': { price: '$0.010', network: this.network }
    }

    return paymentMiddleware(
      this.commercialWallet,
      billingConfig,
      {
        url: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
        secretKey: X402_SECRET_KEY,
        clientApiKey: X402_CLIENT_API_KEY
      }
    )
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    try {
      const totalProjects = this.projectWallets.size
      const totalPolicies = this.projectPolicies.size
      
      const projectStats = Array.from(this.projectWallets.values()).reduce((stats, project) => {
        stats.totalTransactions += project.usage.totalTransactions
        stats.totalRevenue += project.usage.totalCost
        stats.totalAgents += project.usage.agentCount
        return stats
      }, { totalTransactions: 0, totalRevenue: 0, totalAgents: 0 })

      return {
        status: 'healthy',
        cdp_connected: true,
        commercial_wallet: this.commercialWallet,
        network: this.network,
        projects: {
          total: totalProjects,
          total_transactions: projectStats.totalTransactions,
          total_revenue: projectStats.totalRevenue,
          total_agents: projectStats.totalAgents
        },
        policies: {
          total: totalPolicies
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Export singleton instance
export const agentFinancialInfrastructure = new AgentMeterFinancialInfrastructure()

// Export legacy functions for backward compatibility  
export * from './x402-billing.js' 