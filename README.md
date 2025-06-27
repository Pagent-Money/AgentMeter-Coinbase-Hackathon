# 🏆 AgentMeter - Coinbase Agent in Action Hackathon 2025

> **Agent-Native Financial Infrastructure for AI Applications**  
> Seamlessly monetize AI agents with usage-based billing, real-time metering, and autonomous payments via X402 + CDP integration.

[![Python SDK](https://img.shields.io/pypi/v/agentmeter)](https://pypi.org/project/agentmeter/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Coinbase Agent Kit](https://img.shields.io/badge/Coinbase-Agent%20Kit-blue)](https://docs.cdp.coinbase.com/agentkit/docs/welcome)
[![X402 Protocol](https://img.shields.io/badge/X402-Payment%20Protocol-green)](https://www.x402.org/)

## 🚀 Live Demo

**Experience AgentMeter in action:** [**Demo Dashboard**](http://localhost:4003/coinbase-hackathon)

### Featured Demos
1. **📰 Pay-walled Article Unlock** - Instant content access with 0.01 USDC via X402
2. **🤖 Dual AI Chat Agents** - OpenAI + DeepSeek with transparent cost breakdown  
3. **🎁 Gift Card Platform** - Automated gift card generation with blockchain settlement

---

## 🎯 Hackathon Highlights

### 🏗️ **Agent-Native Financial Infrastructure**
AgentMeter enables AI agents to autonomously handle payments, billing, and financial operations without human intervention - a critical requirement for the future of autonomous AI systems.

### 💰 **X402 + CDP Integration**  
- **X402 Protocol**: HTTP 402 "Payment Required" for instant agent payments
- **Coinbase CDP**: Commercial wallets with policy governance and gasless transactions
- **Real-time Settlement**: Sub-second payment processing on Base Sepolia

### 📊 **Comprehensive FinOps Dashboard**
- Real-time usage monitoring and cost analytics
- Multi-agent project management
- Revenue optimization insights
- Automated billing and invoicing

---

## 🛠️ Quick Start

### Installation
```bash
# Install the AgentMeter Python SDK
pip install agentmeter

# Clone the hackathon demo
git clone https://github.com/Pagent-Money/AgentMeter-Coinbase-Hackathon.git
cd AgentMeter-Coinbase-Hackathon

# Install dependencies
yarn install

# Start the demo
yarn start  # Frontend (port 4003)
yarn service  # Backend (port 4021)
```

### Basic Integration
```python
from agentmeter import create_client

# Initialize AgentMeter client
client = create_client(
    api_key="sk_hackathon_demo_12345",
    project_id="hackathon-demo"
)

# Track API usage with automatic billing
@client.meter_api_request_pay(unit_price=0.01)
def unlock_premium_content(user_id):
    return "Premium content unlocked!"

# Token-based billing for LLM usage
@client.meter_token_based_pay(
    input_token_price=0.000015,
    output_token_price=0.000020
)
def ai_chat_completion(prompt, user_id):
    response = openai.chat.completions.create(...)
    return response

# Instant payments for premium features
@client.meter_instant_pay(amount=9.99)
def premium_ai_analysis(data, user_id):
    return advanced_ai_processing(data)
```

---

## 📋 Getting Started: Commercial Account Setup

### Step 1: Register Commercial Account
1. **Visit AgentMeter Dashboard**: [https://agentmeter.money/register](https://agentmeter.money/register)
2. **Create Account**: Sign up with your business email
3. **Verify Email**: Complete email verification process
4. **Business Information**: Provide company details for commercial account

### Step 2: Create Project & Generate API Keys
1. **Access Dashboard**: Log into [https://agentmeter.money/dashboard](https://agentmeter.money/dashboard)
2. **Create New Project**:
   ```
   Project Name: "My AI Agent"
   Description: "AI-powered customer service bot"
   Industry: "Technology"
   ```
3. **Generate API Key Pair**:
   - Navigate to Project Settings → API Keys
   - Click "Generate New Key"
   - **Save your keys securely**:
     ```
     Project ID: proj_abc123...
     API Key: sk_live_xyz789...
     Secret Key: sk_secret_def456...
     ```

### Step 3: Setup CDP Wallet Integration
1. **Enable Coinbase CDP**:
   - Go to Project Settings → Integrations
   - Click "Connect Coinbase CDP"
   - Authorize wallet connection

2. **Configure Commercial Wallet**:
   ```javascript
   // Automated wallet creation with policy governance
   const wallet = await agentmeter.createCommercialWallet({
     network: "base-sepolia",
     policies: {
       daily_limit: "1000.00",
       auto_approve_under: "10.00",
       require_approval_over: "100.00"
     }
   })
   ```

3. **Wallet Capabilities**:
   - **Gasless Transactions**: No ETH required for USDC payments
   - **Policy Governance**: Automated approval workflows
   - **Multi-signature Support**: Enhanced security for high-value transactions
   - **Real-time Monitoring**: Track all wallet activities in dashboard

---

## 🔧 SDK Integration & Payment Policy Setup

### Integration Options

#### Option 1: Python SDK (Recommended)
```python
# Install and configure
pip install agentmeter

from agentmeter import AgentMeterClient, PaymentPolicy

# Initialize with your credentials
client = AgentMeterClient(
    api_key="sk_live_xyz789...",
    project_id="proj_abc123...",
    base_url="https://api.agentmeter.money"
)

# Define payment policies
payment_policy = PaymentPolicy(
    api_request_price=0.01,      # $0.01 per API call
    input_token_price=0.000015,  # $0.000015 per input token
    output_token_price=0.000020, # $0.000020 per output token
    instant_payment_tiers={
        "basic": 4.99,
        "premium": 9.99,
        "enterprise": 24.99
    }
)

# Apply to your agent/application
client.set_payment_policy(payment_policy)
```

#### Option 2: REST API Integration
```javascript
// Direct API integration for any language
const response = await fetch('https://api.agentmeter.money/v1/meter/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    project_id: 'proj_abc123...',
    agent_id: 'my-ai-agent',
    event_type: 'api_request_pay',
    api_calls: 1,
    cost: 0.01,
    user_id: 'user_456',
    metadata: {
      endpoint: '/chat/completion',
      model: 'gpt-4'
    }
  })
})
```

#### Option 3: Coinbase AgentKit Integration
```python
# Enhanced Coinbase AgentKit with AgentMeter billing
from agentmeter.integrations.coinbase import Web3AgentMeter
from cdp import Wallet

# Initialize Web3 agent with comprehensive billing
web3_agent = Web3AgentMeter(
    agentmeter_client=client,
    cdp_api_key_name="your_coinbase_key",
    cdp_private_key="your_private_key",
    network="base-sepolia"
)

# Multi-tier billing for Web3 operations
@web3_agent.meter_blockchain_query(price=0.05)
def get_wallet_balance(user_id, asset):
    """Blockchain query - $0.05 per call"""
    return wallet.get_balance(asset)

@web3_agent.meter_ai_analysis(token_based=True)
def analyze_market_conditions(user_id, asset, analysis_type):
    """AI analysis - charged by token usage"""
    return ai_market_analysis(asset, analysis_type)

@web3_agent.meter_premium_trading(amount=4.99)
def execute_smart_trade(user_id, trade_params):
    """Premium trading - $4.99 instant charge"""
    return execute_trade_with_ai_optimization(trade_params)
```

### Payment Policy Configuration

```python
# Advanced payment policy setup
from agentmeter import PaymentTier, UsageLimits

# Define usage tiers
payment_tiers = {
    "free": PaymentTier(
        api_calls_limit=100,
        tokens_limit=10000,
        features=["basic_chat", "simple_queries"]
    ),
    "pro": PaymentTier(
        api_calls_limit=1000,
        tokens_limit=100000,
        monthly_fee=29.99,
        features=["advanced_chat", "data_analysis", "integrations"]
    ),
    "enterprise": PaymentTier(
        api_calls_limit="unlimited",
        tokens_limit="unlimited",
        monthly_fee=299.99,
        features=["custom_models", "priority_support", "sla"]
    )
}

# Set usage limits and billing rules
client.configure_billing(
    tiers=payment_tiers,
    overage_pricing={
        "api_calls": 0.01,  # $0.01 per additional call
        "tokens": 0.000020   # $0.00002 per additional token
    },
    billing_cycle="monthly",
    auto_upgrade=True  # Automatically upgrade users when limits exceeded
)
```

---

## 📈 Dashboard Monitoring & FinOps

### Real-time Analytics Dashboard

#### Usage Monitoring
- **Live Metrics**: API calls, token usage, active users
- **Cost Breakdown**: Detailed cost attribution by feature/user
- **Performance Insights**: Response times, error rates, throughput
- **User Behavior**: Usage patterns, feature adoption, churn analysis

#### Financial Operations (FinOps)
```python
# Access dashboard data programmatically
analytics = client.get_analytics(timeframe="30_days")

print(f"Total Revenue: ${analytics.total_revenue}")
print(f"Total API Calls: {analytics.total_api_calls}")
print(f"Average Revenue Per User: ${analytics.arpu}")
print(f"Top Features by Revenue: {analytics.top_revenue_features}")

# Revenue optimization insights
insights = client.get_revenue_insights()
for insight in insights:
    print(f"💡 {insight.recommendation}")
    print(f"   Expected Impact: {insight.revenue_impact}")
```

#### Billing & Invoicing
- **Automated Billing**: Generate invoices based on usage
- **Multi-currency Support**: USD, EUR, USDC, ETH
- **Tax Management**: Automatic tax calculation and compliance
- **Payment Processing**: Stripe, crypto payments, bank transfers

#### Alerts & Notifications
```python
# Set up monitoring alerts
client.create_alert(
    name="High Usage Alert",
    condition="api_calls > 1000 in 1_hour",
    notification_channels=["email", "slack", "webhook"]
)

client.create_alert(
    name="Revenue Milestone",
    condition="daily_revenue > 100",
    notification_channels=["email"]
)
```

---

## 💳 CDP Wallet & X402 Integration

### Coinbase Developer Platform (CDP) Integration

#### Commercial Wallet Features
```python
# Create and manage commercial wallets
from agentmeter.integrations.cdp import CommercialWalletManager

wallet_manager = CommercialWalletManager(
    api_key="your_cdp_api_key",
    network="base-sepolia"
)

# Create policy-governed wallet
commercial_wallet = await wallet_manager.create_wallet(
    name="AI Agent Payment Wallet",
    policies={
        "daily_spend_limit": "1000.00",
        "single_transaction_limit": "100.00",
        "auto_approve_under": "10.00",
        "require_multisig_over": "500.00",
        "allowed_contracts": ["USDC", "ETH"],
        "restricted_addresses": []
    }
)

# Gasless transaction capabilities
transaction = await commercial_wallet.send_gasless(
    to="0x742d35cC6435C0532C8C4b0CA14b9d06b7E1b1e6",
    amount="0.01",
    asset="USDC",
    memo="AI service payment"
)
```

#### Smart Account Abstraction
- **Gasless Transactions**: Users don't need ETH for USDC payments
- **Batch Operations**: Multiple payments in single transaction
- **Social Recovery**: Account recovery without seed phrases
- **Custom Validation**: Business logic in smart contracts

### X402 Protocol Integration

#### HTTP 402 Payment Flow
```python
# X402 payment-required responses
from agentmeter.x402 import X402PaymentHandler

@app.route('/premium-api-endpoint')
@X402PaymentHandler(
    amount="0.01",
    asset="USDC",
    network="base-sepolia",
    description="Premium API access"
)
def premium_endpoint():
    """Returns HTTP 402 if payment not provided"""
    return {"result": "Premium data here"}

# Client-side X402 payment handling
async function callPaidAPI(endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    
    if (response.status === 402) {
        // Handle payment required
        const paymentInfo = await response.json();
        const paymentResult = await processX402Payment(paymentInfo);
        
        // Retry with payment proof
        return fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-Payment-Hash': paymentResult.txHash
            },
            body: JSON.stringify(data)
        });
    }
    
    return response;
}
```

#### Autonomous Agent Payments
```python
# Agents can autonomously handle payments
class AutonomousPaymentAgent:
    def __init__(self, wallet, budget_limit):
        self.wallet = wallet
        self.budget_limit = budget_limit
        self.daily_spent = 0
    
    async def access_paid_service(self, service_url, cost):
        # Check budget constraints
        if self.daily_spent + cost > self.budget_limit:
            return {"error": "Budget limit exceeded"}
        
        # Autonomous payment decision
        if cost <= 0.10:  # Auto-approve small payments
            payment = await self.wallet.send_payment(
                amount=cost,
                to=service_url,
                memo="Autonomous service payment"
            )
            self.daily_spent += cost
            return {"payment_hash": payment.hash}
        else:
            # Require human approval for larger amounts
            return {"status": "approval_required", "amount": cost}
```

#### Payment Settlement & Verification
```python
# Real-time payment verification
async def verify_x402_payment(tx_hash, expected_amount):
    """Verify payment on Base Sepolia"""
    transaction = await base_client.get_transaction(tx_hash)
    
    if transaction.status == "confirmed":
        if transaction.value >= expected_amount:
            return {
                "verified": True,
                "amount": transaction.value,
                "block_number": transaction.block_number,
                "confirmation_time": transaction.timestamp
            }
    
    return {"verified": False}

# Automatic payment processing
@webhook_handler('/x402-payment-received')
async def process_payment_notification(payment_data):
    """Handle incoming X402 payment notifications"""
    verification = await verify_x402_payment(
        payment_data.tx_hash,
        payment_data.expected_amount
    )
    
    if verification.verified:
        # Grant access to paid resource
        await grant_service_access(
            user_id=payment_data.user_id,
            service=payment_data.service,
            duration="24_hours"
        )
        
        # Record in AgentMeter
        await client.record_payment_received(
            amount=verification.amount,
            tx_hash=payment_data.tx_hash,
            user_id=payment_data.user_id
        )
```

---

## 🎮 Hackathon Demo Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Blockchain    │
│   (React)       │    │   (Node.js)      │    │  (Base Sepolia) │
│                 │    │                  │    │                 │
│ • Demo UI       │◄──►│ • X402 Endpoints │◄──►│ • USDC Contract │
│ • Wallet Connect│    │ • AgentMeter API │    │ • CDP Wallets   │
│ • Payment Flow  │    │ • Gift Card Gen  │    │ • Transaction   │
│                 │    │ • Analytics      │    │   Settlement    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   AgentMeter     │
                    │   Platform       │
                    │                  │
                    │ • Usage Tracking │
                    │ • Billing Engine │
                    │ • Analytics      │
                    │ • Dashboard      │
                    └──────────────────┘
```

### Key Components

1. **X402 Payment Gateway**
   - HTTP 402 payment-required responses
   - Automatic payment verification
   - Sub-second settlement on Base Sepolia

2. **AgentMeter Billing Engine**
   - Real-time usage tracking
   - Multi-tier pricing models
   - Automated invoice generation

3. **CDP Wallet Integration**
   - Gasless USDC transactions
   - Policy-governed spending
   - Smart account abstraction

4. **Demo Applications**
   - Article paywall unlock
   - AI chat with cost breakdown
   - E-commerce gift card platform

---

## 🔗 Resources & Links

### 🛠️ Development Resources
- **Python SDK**: [PyPI Package](https://pypi.org/project/agentmeter/)
- **GitHub Repository**: [AgentMeter SDK Python](https://github.com/Pagent-Money/agentmeter-sdk-python)
- **API Documentation**: [docs.agentmeter.money](https://docs.agentmeter.money)
- **Hackathon Demo**: [GitHub Repo](https://github.com/Pagent-Money/AgentMeter-Coinbase-Hackathon)

### 🌐 Platform Links
- **AgentMeter Dashboard**: [agentmeter.money](https://agentmeter.money)
- **Commercial Registration**: [agentmeter.money/register](https://agentmeter.money/register)
- **Support Portal**: [support.agentmeter.money](https://support.agentmeter.money)

### 📚 Integration Guides
- **Coinbase AgentKit**: [CDP AgentKit Docs](https://docs.cdp.coinbase.com/agentkit/docs/welcome)
- **X402 Protocol**: [x402.org](https://www.x402.org/)
- **Base Sepolia Testnet**: [Base Docs](https://docs.base.org/docs/using-base)

### 🏆 Hackathon Submission
- **Team**: Pagent Money
- **Category**: Agent-Native Financial Infrastructure
- **Contact**: thomas.yu@knn3.xyz
- **Demo URL**: [Live Demo](http://localhost:4003/coinbase-hackathon)

---

## 🚀 Get Started Now

```bash
# 1. Install AgentMeter SDK
pip install agentmeter

# 2. Clone hackathon demo
git clone https://github.com/Pagent-Money/AgentMeter-Coinbase-Hackathon.git
cd AgentMeter-Coinbase-Hackathon

# 3. Install and run
yarn install
yarn start    # Frontend on port 4003
yarn service  # Backend on port 4021

# 4. Visit the demo
open http://localhost:4003/coinbase-hackathon
```

**Ready to monetize your AI agents? Start building with AgentMeter today!** 🚀

---

*Built for Coinbase Agent in Action Hackathon 2025 - Empowering the Future of Autonomous AI Commerce* 🏆
