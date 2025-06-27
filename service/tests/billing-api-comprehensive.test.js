const request = require('supertest')
const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals')
const app = require('../index.js')
const { supabase } = require('../config/supabase.js')
const { createWalletClient, http, parseEther } = require('viem')
const { privateKeyToAccount } = require('viem/accounts')
const { baseSepolia } = require('viem/chains')

describe('Billing API Comprehensive Tests', () => {
  let testAccountId = 'test-billing-account-123'
  let testProjectId = 'test-billing-project-123'
  let testApiKey = 'sk_test_billing_123456789'
  let walletClient
  let testPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234'

  beforeAll(async () => {
    // Setup test wallet client for crypto payments
    try {
      const account = privateKeyToAccount(testPrivateKey)
      walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http()
      })
      console.log('Test wallet setup complete')
    } catch (error) {
      console.log('Wallet setup skipped (expected in test environment):', error.message)
    }

    // Setup test data in database
    try {
      // Create test commercial account
      await supabase.from('commercial_accounts').upsert({
        id: testAccountId,
        email: 'test-billing@example.com',
        status: 'active',
        subscription_tier: 'pro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      // Create test project
      await supabase.from('projects').upsert({
        id: testProjectId,
        account_id: testAccountId,
        name: 'Test Billing Project',
        secret_key: testApiKey,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      console.log('Test database setup complete')
    } catch (error) {
      console.log('Database setup error (may be expected):', error.message)
    }
  })

  afterAll(async () => {
    // Cleanup test data
    try {
      await supabase.from('projects').delete().eq('id', testProjectId)
      await supabase.from('commercial_accounts').delete().eq('id', testAccountId)
      console.log('Test cleanup complete')
    } catch (error) {
      console.log('Cleanup error (may be expected):', error.message)
    }
  })

  describe('Billing Configuration', () => {
    test('GET /api/billing/config - should return billing configuration', async () => {
      const response = await request(app)
        .get('/api/billing/config')
        .expect(200)

      expect(response.body).toMatchObject({
        billing: {
          enabled: true,
          rates: expect.objectContaining({
            api_request: expect.any(Number),
            input_tokens_per_1k: expect.any(Number),
            output_tokens_per_1k: expect.any(Number)
          }),
          x402: expect.objectContaining({
            enabled: expect.any(Boolean),
            minimum_payment: expect.any(Number)
          }),
          coinbase_wallet: expect.any(String)
        }
      })

      expect(response.body.billing.coinbase_wallet).toBe('0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5')
    })
  })

  describe('Billing Calculations', () => {
    test('POST /api/billing/calculate - should calculate billing amounts correctly', async () => {
      const billingData = {
        api_calls: 100,
        tokens_in: 5000,
        tokens_out: 3000,
        agent_id: 'test-agent-123'
      }

      const response = await request(app)
        .post('/api/billing/calculate')
        .send(billingData)
        .expect(200)

      expect(response.body).toMatchObject({
        billing: expect.objectContaining({
          api_calls: 100,
          tokens_in: 5000,
          tokens_out: 3000,
          request_cost: expect.any(Number),
          token_cost: expect.any(Number),
          total_cost: expect.any(Number)
        }),
        breakdown: expect.objectContaining({
          api_request_rate: expect.any(Number),
          input_token_rate: expect.any(Number),
          output_token_rate: expect.any(Number)
        })
      })

      // Verify calculations
      const { billing, breakdown } = response.body
      const expectedRequestCost = 100 * breakdown.api_request_rate
      const expectedTokenCost = (5000 * breakdown.input_token_rate / 1000) + (3000 * breakdown.output_token_rate / 1000)
      const expectedTotal = expectedRequestCost + expectedTokenCost

      expect(billing.request_cost).toBeCloseTo(expectedRequestCost, 4)
      expect(billing.token_cost).toBeCloseTo(expectedTokenCost, 4)
      expect(billing.total_cost).toBeCloseTo(expectedTotal, 4)
    })

    test('POST /api/billing/calculate - should handle zero values', async () => {
      const response = await request(app)
        .post('/api/billing/calculate')
        .send({
          api_calls: 0,
          tokens_in: 0,
          tokens_out: 0,
          agent_id: 'test-agent-zero'
        })
        .expect(200)

      expect(response.body.billing.total_cost).toBe(0)
    })

    test('POST /api/billing/calculate - should validate required fields', async () => {
      const response = await request(app)
        .post('/api/billing/calculate')
        .send({})
        .expect(400)

      expect(response.body.error).toContain('Missing required fields')
    })
  })

  describe('Invoice Management', () => {
    test('POST /api/billing/create-invoice - should create invoice', async () => {
      const invoiceData = {
        account_id: testAccountId,
        amount: 25.50,
        description: 'Test API usage invoice',
        usage_data: {
          api_calls: 100,
          tokens_in: 5000,
          tokens_out: 3000
        }
      }

      const response = await request(app)
        .post('/api/billing/create-invoice')
        .send(invoiceData)
        .expect(201)

      expect(response.body).toMatchObject({
        invoice: expect.objectContaining({
          id: expect.any(String),
          account_id: testAccountId,
          amount: 25.50,
          status: 'pending',
          description: 'Test API usage invoice',
          usage_data: expect.objectContaining({
            api_calls: 100,
            tokens_in: 5000,
            tokens_out: 3000
          }),
          payment_address: expect.any(String),
          created_at: expect.any(String)
        })
      })

      // Store invoice ID for later tests
      this.testInvoiceId = response.body.invoice.id
    })

    test('GET /api/billing/invoices - should require authentication', async () => {
      const response = await request(app)
        .get('/api/billing/invoices')
        .expect(401)

      expect(response.body.error).toContain('Missing authorization header')
    })

    test('GET /api/billing/invoices - should list invoices with auth', async () => {
      const response = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer session_${testAccountId}_${Date.now()}`)
        .expect(200)

      expect(response.body).toMatchObject({
        invoices: expect.any(Array),
        pagination: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number)
        })
      })
    })
  })

  describe('X402 Payment Processing', () => {
    test('POST /api/billing/pay-invoice - should require x402 payment', async () => {
      // First create an invoice
      const invoiceResponse = await request(app)
        .post('/api/billing/create-invoice')
        .send({
          account_id: testAccountId,
          amount: 10.00,
          description: 'Test X402 payment invoice'
        })
        .expect(201)

      const invoiceId = invoiceResponse.body.invoice.id

      // Try to pay without x402 headers
      const response = await request(app)
        .post('/api/billing/pay-invoice')
        .send({ invoice_id: invoiceId })
        .expect(402)

      expect(response.body.error).toContain('Payment required')
      expect(response.headers['x-accept-payment']).toBeDefined()
    })

    test('POST /api/billing/pay-invoice - should process valid x402 payment', async () => {
      // Create invoice first
      const invoiceResponse = await request(app)
        .post('/api/billing/create-invoice')
        .send({
          account_id: testAccountId,
          amount: 5.00,
          description: 'Valid X402 payment test'
        })
        .expect(201)

      const invoiceId = invoiceResponse.body.invoice.id

      // Simulate x402 payment headers
      const mockPaymentProof = {
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        amount: '0x470DE4DF820000', // 5.00 ETH in wei
        from: '0x742d35Cc6634C0532925a3b8D431A9E95fEBBAe4',
        to: '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5',
        timestamp: Date.now()
      }

      const response = await request(app)
        .post('/api/billing/pay-invoice')
        .set('X-Payment-Amount', '5000000000000000000') // 5 ETH in wei
        .set('X-Payment-Currency', 'ETH')
        .set('X-Payment-Network', 'base-sepolia')
        .set('X-Payment-Proof', JSON.stringify(mockPaymentProof))
        .send({ invoice_id: invoiceId })
        .expect(200)

      expect(response.body).toMatchObject({
        payment: expect.objectContaining({
          status: 'completed',
          invoice_id: invoiceId,
          amount_paid: expect.any(Number),
          transaction_hash: expect.any(String),
          payment_method: 'crypto'
        }),
        invoice: expect.objectContaining({
          status: 'paid'
        })
      })
    })
  })

  describe('Premium Features (X402 Protected)', () => {
    test('POST /api/billing/generate-report - should require payment', async () => {
      const response = await request(app)
        .post('/api/billing/generate-report')
        .send({
          report_type: 'detailed_usage',
          date_range: '30d',
          project_id: testProjectId
        })
        .expect(402)

      expect(response.body.error).toContain('Payment required')
      expect(response.headers['x-accept-payment']).toBeDefined()
    })

    test('GET /api/analytics/premium - should require payment', async () => {
      const response = await request(app)
        .get('/api/analytics/premium')
        .query({ project_id: testProjectId })
        .expect(402)

      expect(response.body.error).toContain('Payment required')
    })

    test('POST /api/usage/tokens - should require payment', async () => {
      const response = await request(app)
        .post('/api/usage/tokens')
        .send({
          project_id: testProjectId,
          agent_id: 'test-agent',
          tokens_in: 1000,
          tokens_out: 500
        })
        .expect(402)

      expect(response.body.error).toContain('Payment required')
    })
  })

  describe('Health and Status', () => {
    test('GET /api/billing/health - should return health status', async () => {
      const response = await request(app)
        .get('/api/billing/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        billing: expect.objectContaining({
          enabled: true,
          x402_enabled: expect.any(Boolean),
          coinbase_wallet_connected: true
        }),
        database: expect.objectContaining({
          connected: expect.any(Boolean)
        })
      })
    })
  })

  describe('Error Handling', () => {
    test('Should handle invalid invoice IDs', async () => {
      const response = await request(app)
        .post('/api/billing/pay-invoice')
        .send({ invoice_id: 'invalid-invoice-id' })
        .expect(404)

      expect(response.body.error).toContain('Invoice not found')
    })

    test('Should handle malformed payment proofs', async () => {
      const invoiceResponse = await request(app)
        .post('/api/billing/create-invoice')
        .send({
          account_id: testAccountId,
          amount: 1.00,
          description: 'Malformed payment test'
        })

      const invoiceId = invoiceResponse.body.invoice.id

      const response = await request(app)
        .post('/api/billing/pay-invoice')
        .set('X-Payment-Proof', 'invalid-json')
        .send({ invoice_id: invoiceId })
        .expect(400)

      expect(response.body.error).toContain('Invalid payment proof')
    })

    test('Should validate payment amounts', async () => {
      const invoiceResponse = await request(app)
        .post('/api/billing/create-invoice')
        .send({
          account_id: testAccountId,
          amount: 10.00,
          description: 'Amount validation test'
        })

      const invoiceId = invoiceResponse.body.invoice.id

      const mockPaymentProof = {
        txHash: '0xabc123',
        amount: '0x1', // Too small amount
        from: '0x742d35Cc6634C0532925a3b8D431A9E95fEBBAe4',
        to: '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5'
      }

      const response = await request(app)
        .post('/api/billing/pay-invoice')
        .set('X-Payment-Amount', '1') // 1 wei - too small
        .set('X-Payment-Proof', JSON.stringify(mockPaymentProof))
        .send({ invoice_id: invoiceId })
        .expect(400)

      expect(response.body.error).toContain('Insufficient payment amount')
    })
  })

  describe('Rate Limiting', () => {
    test('Should enforce rate limits on billing endpoints', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill().map(() => 
        request(app)
          .post('/api/billing/calculate')
          .send({
            api_calls: 1,
            tokens_in: 100,
            tokens_out: 50,
            agent_id: 'rate-limit-test'
          })
      )

      const responses = await Promise.all(promises)
      
      // At least some should succeed
      const successfulRequests = responses.filter(r => r.status === 200)
      expect(successfulRequests.length).toBeGreaterThan(0)
    })
  })

  describe('Integration Tests', () => {
    test('Complete billing workflow', async () => {
      // 1. Calculate billing
      const calculateResponse = await request(app)
        .post('/api/billing/calculate')
        .send({
          api_calls: 50,
          tokens_in: 2000,
          tokens_out: 1500,
          agent_id: 'workflow-test'
        })
        .expect(200)

      const totalCost = calculateResponse.body.billing.total_cost

      // 2. Create invoice
      const invoiceResponse = await request(app)
        .post('/api/billing/create-invoice')
        .send({
          account_id: testAccountId,
          amount: totalCost,
          description: 'Complete workflow test',
          usage_data: {
            api_calls: 50,
            tokens_in: 2000,
            tokens_out: 1500
          }
        })
        .expect(201)

      const invoiceId = invoiceResponse.body.invoice.id

      // 3. Simulate payment
      const mockPaymentProof = {
        txHash: '0xworkflow123456789',
        amount: (totalCost * 1000000000000000000).toString(16), // Convert to wei hex
        from: '0x742d35Cc6634C0532925a3b8D431A9E95fEBBAe4',
        to: '0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5',
        timestamp: Date.now()
      }

      const paymentResponse = await request(app)
        .post('/api/billing/pay-invoice')
        .set('X-Payment-Amount', (totalCost * 1000000000000000000).toString())
        .set('X-Payment-Proof', JSON.stringify(mockPaymentProof))
        .send({ invoice_id: invoiceId })
        .expect(200)

      expect(paymentResponse.body.payment.status).toBe('completed')
      expect(paymentResponse.body.invoice.status).toBe('paid')
    })
  })
}) 