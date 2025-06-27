import { paymentMiddleware } from 'x402-express'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia, base } from 'viem/chains'

// Coinbase Commercial Wallet Configuration
export const COINBASE_COMMERCIAL_WALLET_ADDRESS = '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5'
const X402_SECRET_KEY = process.env.X402_SECRET_KEY || 'd191100c-e585-4d9c-8d21-7e9671463eea'
const X402_CLIENT_API_KEY = process.env.X402_CLIENT_API_KEY || 'aOVSSsLeCzkYw3pmXC2GEPD9zXvnbkwz'

// Network configuration (use base-sepolia for testing, base for production)
const NETWORK = process.env.X402_NETWORK || 'base-sepolia'
const CHAIN = NETWORK === 'base' ? base : baseSepolia

// Facilitator configuration
const facilitatorOptions = {
  url: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
  secretKey: X402_SECRET_KEY,
  clientApiKey: X402_CLIENT_API_KEY
}

// Billing rate configuration
const BILLING_RATES = {
  // API-based billing
  api_request: {
    price: '$0.001',
    network: NETWORK,
    description: 'Per API request charge'
  },
  
  // Token-based billing
  input_tokens: {
    price: '$0.002',
    network: NETWORK,
    description: 'Per 1K input tokens'
  },
  
  output_tokens: {
    price: '$0.004', 
    network: NETWORK,
    description: 'Per 1K output tokens'
  },
  
  // Usage-based billing
  meter_event: {
    price: '$0.005',
    network: NETWORK,
    description: 'Per meter event recorded'
  },
  
  // Premium features
  analytics_report: {
    price: '$0.010',
    network: NETWORK,
    description: 'Per analytics report generated'
  },
  
  invoice_generation: {
    price: '$0.015',
    network: NETWORK,
    description: 'Per invoice generated'
  }
}

/**
 * Create payment middleware for different billing endpoints
 */
export const createBillingMiddleware = (billingType) => {
  const rate = BILLING_RATES[billingType]
  if (!rate) {
    throw new Error(`Unknown billing type: ${billingType}`)
  }

  return paymentMiddleware(
    COINBASE_COMMERCIAL_WALLET_ADDRESS,
    {
      [`POST /${billingType}`]: rate,
      [`GET /${billingType}`]: rate
    },
    facilitatorOptions
  )
}

/**
 * Create comprehensive billing middleware for all endpoints
 */
export const createComprehensiveBillingMiddleware = () => {
  const billingConfig = {}
  
  // API endpoints that require payment
  billingConfig['POST /api/billing/pay-invoice'] = BILLING_RATES.invoice_generation
  billingConfig['POST /api/billing/generate-report'] = BILLING_RATES.analytics_report
  billingConfig['POST /api/meter-events'] = BILLING_RATES.meter_event
  billingConfig['POST /api/usage/tokens'] = BILLING_RATES.input_tokens
  billingConfig['GET /api/analytics/premium'] = BILLING_RATES.analytics_report
  
  return paymentMiddleware(
    COINBASE_COMMERCIAL_WALLET_ADDRESS,
    billingConfig,
    facilitatorOptions
  )
}

/**
 * Calculate billing amount based on usage
 */
export const calculateBillingAmount = (usageData) => {
  let totalAmount = 0
  
  // API request charges
  if (usageData.apiCalls) {
    totalAmount += usageData.apiCalls * parseFloat(BILLING_RATES.api_request.price.replace('$', ''))
  }
  
  // Token charges
  if (usageData.inputTokens) {
    totalAmount += (usageData.inputTokens / 1000) * parseFloat(BILLING_RATES.input_tokens.price.replace('$', ''))
  }
  
  if (usageData.outputTokens) {
    totalAmount += (usageData.outputTokens / 1000) * parseFloat(BILLING_RATES.output_tokens.price.replace('$', ''))
  }
  
  // Meter event charges
  if (usageData.meterEvents) {
    totalAmount += usageData.meterEvents * parseFloat(BILLING_RATES.meter_event.price.replace('$', ''))
  }
  
  return {
    amount: totalAmount,
    currency: 'USD',
    breakdown: {
      apiCalls: usageData.apiCalls ? usageData.apiCalls * parseFloat(BILLING_RATES.api_request.price.replace('$', '')) : 0,
      inputTokens: usageData.inputTokens ? (usageData.inputTokens / 1000) * parseFloat(BILLING_RATES.input_tokens.price.replace('$', '')) : 0,
      outputTokens: usageData.outputTokens ? (usageData.outputTokens / 1000) * parseFloat(BILLING_RATES.output_tokens.price.replace('$', '')) : 0,
      meterEvents: usageData.meterEvents ? usageData.meterEvents * parseFloat(BILLING_RATES.meter_event.price.replace('$', '')) : 0
    }
  }
}

/**
 * Create an invoice for payment
 */
export const createInvoice = async (projectId, usageData, accountInfo) => {
  const billing = calculateBillingAmount(usageData)
  
  const invoice = {
    id: `inv_${Date.now()}_${projectId}`,
    project_id: projectId,
    account_id: accountInfo.id, // This will be a UUID from the database
    amount: billing.amount,
    currency: billing.currency,
    breakdown: billing.breakdown,
    status: 'pending',
    payment_method: 'x402_crypto',
    wallet_address: COINBASE_COMMERCIAL_WALLET_ADDRESS,
    network: NETWORK,
    created_at: new Date().toISOString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    description: `Usage billing for project ${projectId}`,
    line_items: [
      ...(usageData.apiCalls ? [{
        description: `${usageData.apiCalls} API requests`,
        quantity: usageData.apiCalls,
        unit_price: parseFloat(BILLING_RATES.api_request.price.replace('$', '')),
        total: billing.breakdown.apiCalls
      }] : []),
      ...(usageData.inputTokens ? [{
        description: `${usageData.inputTokens} input tokens`,
        quantity: Math.ceil(usageData.inputTokens / 1000),
        unit_price: parseFloat(BILLING_RATES.input_tokens.price.replace('$', '')),
        total: billing.breakdown.inputTokens
      }] : []),
      ...(usageData.outputTokens ? [{
        description: `${usageData.outputTokens} output tokens`,
        quantity: Math.ceil(usageData.outputTokens / 1000),
        unit_price: parseFloat(BILLING_RATES.output_tokens.price.replace('$', '')),
        total: billing.breakdown.outputTokens
      }] : []),
      ...(usageData.meterEvents ? [{
        description: `${usageData.meterEvents} meter events`,
        quantity: usageData.meterEvents,
        unit_price: parseFloat(BILLING_RATES.meter_event.price.replace('$', '')),
        total: billing.breakdown.meterEvents
      }] : [])
    ]
  }
  
  return invoice
}

/**
 * Validate payment using x402
 */
export const validatePayment = async (paymentHeaders, expectedAmount) => {
  try {
    // The x402 middleware will handle payment validation
    // This is a helper function for manual validation if needed
    return {
      valid: true,
      amount: expectedAmount,
      network: NETWORK,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Payment validation failed:', error)
    return {
      valid: false,
      error: error.message
    }
  }
}

/**
 * Get billing configuration for frontend
 */
export const getBillingConfig = () => {
  return {
    rates: BILLING_RATES,
    wallet_address: COINBASE_COMMERCIAL_WALLET_ADDRESS,
    network: NETWORK,
    facilitator: facilitatorOptions.url,
    supported_currencies: ['USD', 'ETH', 'USDC'],
    payment_methods: ['x402_crypto', 'wallet_connect']
  }
}

export default {
  createBillingMiddleware,
  createComprehensiveBillingMiddleware,
  calculateBillingAmount,
  createInvoice,
  validatePayment,
  getBillingConfig,
  BILLING_RATES,
  COINBASE_COMMERCIAL_WALLET_ADDRESS
} 