# Billing API Documentation

## Overview

The AgentMeter Billing API provides comprehensive billing and payment functionality integrated with x402 payment protocol and Coinbase Commercial Wallet. This API supports cryptocurrency payments flowing directly to your Coinbase Commercial Wallet address.

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:4021/api
```

## Authentication

The Billing API supports multiple authentication methods:

1. **Session Tokens** (Frontend): `Authorization: Bearer session_{userId}_{timestamp}`
2. **API Keys** (Backend): `Authorization: Bearer sk_live_...` or `Authorization: Bearer pk_live_...`
3. **Project Secret Keys** (Legacy): `Authorization: Bearer {project_secret_key}`

## Endpoints

### 1. Billing Configuration

**GET** `/billing/config`

Returns current billing configuration, rates, and wallet information.

```bash
curl -X GET http://localhost:4021/api/billing/config
```

**Response:**
```json
{
  "success": true,
  "config": {
    "rates": {
      "api_request": {
        "price": "$0.001",
        "network": "base-sepolia",
        "description": "Per API request charge"
      },
      "input_tokens": {
        "price": "$0.002",
        "network": "base-sepolia",
        "description": "Per 1K input tokens"
      },
      "output_tokens": {
        "price": "$0.004",
        "network": "base-sepolia",
        "description": "Per 1K output tokens"
      },
      "meter_event": {
        "price": "$0.005",
        "network": "base-sepolia",
        "description": "Per meter event recorded"
      },
      "analytics_report": {
        "price": "$0.010",
        "network": "base-sepolia",
        "description": "Per analytics report generated"
      },
      "invoice_generation": {
        "price": "$0.015",
        "network": "base-sepolia",
        "description": "Per invoice generated"
      }
    },
    "wallet_address": "0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5",
    "network": "base-sepolia",
    "facilitator": "https://x402.org/facilitator",
    "supported_currencies": ["USD", "ETH", "USDC"],
    "payment_methods": ["x402_crypto", "wallet_connect"]
  }
}
```

### 2. Calculate Billing

**POST** `/billing/calculate`

Calculates billing amounts based on usage data.

```bash
curl -X POST http://localhost:4021/api/billing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "usage_data": {
      "api_calls": 100,
      "tokens_in": 5000,
      "tokens_out": 3000,
      "agent_id": "test-agent"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "billing": {
    "amount": 0.032,
    "currency": "USD",
    "breakdown": {
      "apiCalls": 0.1,
      "inputTokens": 0.01,
      "outputTokens": 0.012,
      "meterEvents": 0.005
    }
  }
}
```

### 3. Create Invoice

**POST** `/billing/create-invoice`

Creates a new invoice for billing.

```bash
curl -X POST http://localhost:4021/api/billing/create-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "account_123",
    "amount": 25.50,
    "description": "API usage for December 2024",
    "usage_data": {
      "api_calls": 1000,
      "tokens_in": 50000,
      "tokens_out": 30000
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "inv_1234567890",
    "account_id": "account_123",
    "amount": 25.50,
    "currency": "USD",
    "status": "pending",
    "description": "API usage for December 2024",
    "payment_address": "0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5",
    "created_at": "2024-12-26T16:43:07.000Z",
    "due_date": "2024-12-31T23:59:59.000Z"
  }
}
```

### 4. Process Payment (X402 Protected) 🔒

**POST** `/billing/pay-invoice`

Processes invoice payment using x402 protocol.

```bash
curl -X POST http://localhost:4021/api/billing/pay-invoice \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: {payment_proof}" \
  -d '{"invoice_id": "inv_1234567890"}'
```

**X402 Payment Required Response (402):**
```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "10000",
      "resource": "http://localhost:4021/api/billing/pay-invoice",
      "payTo": "0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5",
      "maxTimeoutSeconds": 60,
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "extra": {
        "name": "USDC",
        "version": "2"
      }
    }
  ]
}
```

### 5. List Invoices (Auth Required) 🔒

**GET** `/billing/invoices`

Lists invoices for the authenticated account.

```bash
curl -X GET http://localhost:4021/api/billing/invoices \
  -H "Authorization: Bearer session_user123_1640545387000"
```

**Response:**
```json
{
  "success": true,
  "invoices": [
    {
      "id": "inv_1234567890",
      "amount": 25.50,
      "status": "pending",
      "created_at": "2024-12-26T16:43:07.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

### 6. Generate Report (X402 Premium) 🔒💎

**POST** `/billing/generate-report`

Generates detailed billing and usage reports (requires payment).

```bash
curl -X POST http://localhost:4021/api/billing/generate-report \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: {payment_proof}" \
  -d '{
    "report_type": "detailed_usage",
    "date_range": "30d",
    "project_id": "proj_123"
  }'
```

### 7. Premium Analytics (X402 Premium) 🔒💎

**GET** `/analytics/premium`

Access premium analytics features (requires payment).

```bash
curl -X GET http://localhost:4021/api/analytics/premium \
  -H "X-PAYMENT: {payment_proof}" \
  -H "Authorization: Bearer session_user123_1640545387000"
```

### 8. Token Usage Billing (X402 Premium) 🔒💎

**POST** `/usage/tokens`

Bill for token usage with enhanced tracking (requires payment).

```bash
curl -X POST http://localhost:4021/api/usage/tokens \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: {payment_proof}" \
  -d '{
    "project_id": "proj_123",
    "agent_id": "agent_456",
    "tokens_in": 1000,
    "tokens_out": 500
  }'
```

### 9. Health Check

**GET** `/billing/health`

Returns billing system health status.

```bash
curl -X GET http://localhost:4021/api/billing/health
```

**Response:**
```json
{
  "success": true,
  "service": "billing-api",
  "status": "healthy",
  "wallet_address": "0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5",
  "timestamp": "2024-12-26T16:43:07.129Z"
}
```

## X402 Integration

### Payment Flow

1. **Make Request**: Call any premium endpoint
2. **Receive 402**: Get payment requirement details
3. **Process Payment**: Use x402-compatible wallet/client
4. **Retry Request**: Include payment proof in X-PAYMENT header

### Payment Proof Format

```json
{
  "txHash": "0x1234...abcd",
  "amount": "0x470DE4DF820000",
  "from": "0x742d35...FEBBAe4",
  "to": "0x08Cd4C...121bEe5",
  "timestamp": 1640545387000,
  "network": "base-sepolia"
}
```

### Client Integration Example

```javascript
import { wrapFetchWithPayment } from 'x402-fetch'

// Configure x402 client
const paymentFetch = wrapFetchWithPayment(fetch, {
  walletClient: yourWalletClient,
  onPaymentRequired: (details) => console.log('Payment required:', details),
  onPaymentSent: (tx) => console.log('Payment sent:', tx)
})

// Use like regular fetch - payments handled automatically
const response = await paymentFetch('/api/billing/generate-report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ report_type: 'usage', period: '30d' })
})
```

## Pricing

| Service | Price | Network | Description |
|---------|-------|---------|-------------|
| API Request | $0.001 | Base Sepolia | Per API request |
| Input Tokens | $0.002 | Base Sepolia | Per 1K input tokens |
| Output Tokens | $0.004 | Base Sepolia | Per 1K output tokens |
| Meter Event | $0.005 | Base Sepolia | Per meter event recorded |
| Analytics Report | $0.010 | Base Sepolia | Per analytics report |
| Invoice Generation | $0.015 | Base Sepolia | Per invoice generated |

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid authentication |
| 402 | Payment Required - X402 payment needed |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server issue |

## Rate Limits

- **Free Tier**: 100 requests/minute
- **Premium Tier**: 1000 requests/minute
- **Enterprise**: Unlimited

## Security

- All payments flow directly to Coinbase Commercial Wallet
- X402 protocol ensures payment verification
- End-to-end encryption for sensitive data
- Rate limiting and DDoS protection
- Secure key management and rotation

## Testing

Run the comprehensive test suite:

```bash
# Mock tests (no network required)
npm test billing-comprehensive.test.js

# Integration tests (requires running service)
curl -X GET http://localhost:4021/api/billing/health
curl -X POST http://localhost:4021/api/billing/calculate -d '{"usage_data":{"api_calls":100}}'
```

## Production Deployment

1. Set environment variables:
   ```bash
   X402_COINBASE_COMMERCIAL_WALLET_ADDRESS=0x08Cd4C79fd197640c004e5aEd98Bb0b3a121bEe5
   X402_NETWORK=base-mainnet
   X402_ENABLED=true
   ```

2. Deploy with proper SSL certificates
3. Configure rate limiting and monitoring
4. Set up payment reconciliation workflows

## Support

For billing API support:
- Documentation: [GitHub Wiki](https://github.com/your-org/agentmeter)
- Issues: [GitHub Issues](https://github.com/your-org/agentmeter/issues)
- Email: billing-support@your-domain.com

---

**Last Updated**: December 26, 2024  
**API Version**: 1.0.0  
**X402 Version**: 1.0 