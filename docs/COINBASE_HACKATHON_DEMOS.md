# 🏆 Coinbase Hackathon - AgentMeter Live Demos

## Overview

This document describes the three live demos created for the Coinbase Hackathon, showcasing the integration of **X402 protocol** with **AgentMeter** for agent-native financial infrastructure.

## 🌐 Live Demo URL

**Frontend**: [http://localhost:3000/coinbase-hackathon](http://localhost:3000/coinbase-hackathon)

## 📋 Demo Specifications

### Configuration
- **Project ID**: `demo-project-hackathon-2024`
- **Network**: Sepolia Testnet
- **Payment Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **USDC Contract**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

## 🎯 Three Live Demos

### 1. 📰 Pay-walled Article Unlock

**Description**: Unlock premium content (X402 whitepaper) with micropayments.

**Features**:
- HTTP 402 "Payment Required" status code implementation
- 0.01 USDC payment via X402 protocol
- Instant content unlock after payment verification
- AgentMeter tracking for content access events

**User Flow**:
1. User sees article preview with blurred content
2. Clicks "Pay to Unlock" button (0.01 USDC)
3. X402 payment flow triggers wallet interaction
4. Upon payment confirmation, full article is revealed
5. AgentMeter records the unlock event

**Technical Implementation**:
```javascript
// API Endpoint: POST /api/unlock-article
{
  "articleId": "x402-whitepaper",
  "projectId": "demo-project-hackathon-2024"
}

// Headers: X-Payment-Amount: "0.01"
// Response: HTTP 402 or 200 with article content
```

### 2. 🤖 Dual AI Chat Agents (OpenAI + DeepSeek)

**Description**: Interactive chat with two AI agents simultaneously, with real-time cost calculation and payment.

**Features**:
- Parallel responses from OpenAI and DeepSeek agents
- Configurable pricing for API requests and tokens
- Real-time cost calculation based on usage
- Automatic payment processing via X402
- Comprehensive AgentMeter tracking

**Pricing Configuration**:
- API Request: $0.001 USDC (default)
- Input Tokens: $0.002 per 1K tokens (default)
- Output Tokens: $0.004 per 1K tokens (default)

**User Flow**:
1. User configures pricing parameters
2. Submits chat message
3. Both AI agents process the request simultaneously
4. Cost calculated based on: API call + token usage
5. X402 payment processed for each agent response
6. Responses displayed with cost breakdown
7. AgentMeter tracks all metrics

**Technical Implementation**:
```javascript
// AI Chat API: POST /api/ai-chat
{
  "message": "What is x402 protocol?",
  "provider": "openai", // or "deepseek"
  "projectId": "demo-project-hackathon-2024"
}

// Payment API: POST /api/process-ai-payment
// Headers: X-Payment-Amount: "{calculated_cost}"
```

### 3. 🛒 InstantPay Ecommerce

**Description**: Instant product purchasing without traditional checkout processes.

**Features**:
- Single-click product purchase
- Instant payment via X402 protocol
- No forms, accounts, or lengthy checkout
- Real-time order confirmation
- AgentMeter tracking for ecommerce events

**Product Example**:
- **Item**: iPhone 15 Pro
- **Price**: $999.00 USDC
- **Settlement**: ~200ms via X402

**User Flow**:
1. User views product details
2. Clicks "Instant Purchase" button
3. X402 payment flow processes $999.00 USDC
4. Order confirmed with unique order ID
5. AgentMeter records purchase event

**Technical Implementation**:
```javascript
// Order API: POST /api/place-order
{
  "productId": "iphone-15-pro",
  "price": "999.00",
  "projectId": "demo-project-hackathon-2024"
}

// Headers: X-Payment-Amount: "999.00"
// Response: Order confirmation with tracking
```

## 🔧 Technical Architecture

### X402 Protocol Integration

**HTTP 402 Implementation**:
```javascript
// Without payment
HTTP/1.1 402 Payment Required
{
  "maxAmountRequired": "0.01",
  "resource": "/api/unlock-article",
  "description": "Access to X402 whitepaper requires payment.",
  "payTo": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "asset": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  "network": "sepolia"
}

// With payment
Headers: X-Payment-Amount: "0.01"
HTTP/1.1 200 OK
{
  "success": true,
  "accessGranted": true,
  "paymentAmount": "0.01"
}
```

### AgentMeter Tracking

**Tracking API**:
```javascript
POST /api/agentmeter/track
{
  "projectId": "demo-project-hackathon-2024",
  "agentId": "article-unlock-agent",
  "eventType": "article_unlock",
  "apiCalls": 1,
  "tokensIn": 0,
  "tokensOut": 0,
  "cost": 0.01,
  "metadata": {
    "articleId": "x402-whitepaper"
  }
}
```

### Frontend Components

**File Structure**:
```
shared/pages/CoinbaseHackathon/
├── index.jsx          # Main demo page component
└── style.css          # Comprehensive styling
```

**Backend Endpoints**:
```
service/
├── demo-endpoints.js  # All demo API endpoints
└── index.js          # Main service with demo routes
```

## 🧪 Testing

### Demo Test Script

Run the comprehensive demo tester:

```bash
node demo-coinbase-hackathon.js
```

**Test Coverage**:
- ✅ Health check for all endpoints
- ✅ Article unlock with/without payment
- ✅ AI chat agents (OpenAI + DeepSeek)
- ✅ Ecommerce instant purchase
- ✅ AgentMeter tracking verification

### Manual Testing

1. **Start the services**:
   ```bash
   # Terminal 1: Backend service
   cd service && npm start
   
   # Terminal 2: Frontend
   npm start
   ```

2. **Access demos**: [http://localhost:3000/coinbase-hackathon](http://localhost:3000/coinbase-hackathon)

3. **Test each demo** with your Sepolia testnet wallet

## 💡 Key Innovation Points

### 1. **Agent-Native Payments**
- Seamless integration of payment flows into agent operations
- No human-in-the-loop intervention required
- Instant settlement with blockchain finality

### 2. **Usage-Based Billing**
- Granular tracking of API calls, tokens, and costs
- Real-time cost calculation and payment processing
- Flexible pricing configuration

### 3. **X402 Protocol Implementation**
- Proper HTTP 402 status code usage
- Standardized payment request/response format
- Compatible with existing web infrastructure

### 4. **Project-Level Financial Management**
- Unified revenue collection per project
- Comprehensive analytics and monitoring
- CDP-enhanced wallet infrastructure

## 🔗 Integration Examples

### React Component Integration

```jsx
import { wrapFetchWithPayment } from 'x402-fetch'

const paymentFetch = wrapFetchWithPayment(fetch, {
  paymentAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  network: 'sepolia'
})

const response = await paymentFetch('/api/unlock-article', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Payment-Amount': '0.01'
  },
  body: JSON.stringify({ articleId: 'x402-whitepaper' })
})
```

### AgentMeter SDK Integration

```javascript
import { AgentMeter } from 'agentmeter-sdk'

const meter = new AgentMeter({
  projectId: 'demo-project-hackathon-2024',
  apiKey: 'sk_demo_coinbase_hackathon_key_123456'
})

await meter.track({
  agentId: 'your-agent-id',
  eventType: 'api_request',
  cost: 0.01
})
```

## 📊 Business Impact

### Revenue Optimization
- **Instant Settlement**: ~200ms payment finality vs. days for traditional rails
- **Reduced Friction**: 1-click payments vs. lengthy checkout processes
- **Global Access**: Blockchain-based payments vs. geographic restrictions

### Cost Efficiency
- **No Chargebacks**: Immutable blockchain transactions
- **Lower Fees**: Minimal gas costs vs. credit card processing fees
- **Automated Billing**: Smart contract automation vs. manual invoicing

### Developer Experience
- **Simple Integration**: Single API endpoint vs. complex payment processors
- **Real-time Analytics**: Instant usage metrics vs. delayed reporting
- **Flexible Pricing**: Granular cost control vs. fixed subscription tiers

## 🎯 Success Metrics

The demos successfully demonstrate:

1. ✅ **X402 Protocol Compliance** - Proper HTTP 402 implementation
2. ✅ **AgentMeter Integration** - Comprehensive usage tracking
3. ✅ **Payment Processing** - Seamless USDC transactions on Sepolia
4. ✅ **User Experience** - Intuitive payment flows
5. ✅ **Technical Robustness** - Error handling and edge cases
6. ✅ **Scalability** - Multiple concurrent payment streams

## 🚀 Future Enhancements

### Short-term
- Mainnet deployment with production USDC
- Additional AI provider integrations
- Enhanced payment confirmation UX

### Long-term
- Multi-chain support (Ethereum, Polygon, Arbitrum)
- Advanced policy governance features
- Machine learning for cost optimization

---

**Built for Coinbase Hackathon 2024** 🏆

*Demonstrating the future of agent-native financial infrastructure with X402 + AgentMeter integration.* 