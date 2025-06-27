import React, { useState, useEffect, useCallback } from 'react'
import styles from './style.css'

const CoinbaseHackathon = () => {
  // Demo 1: Pay-walled Article State
  const [articleUnlocked, setArticleUnlocked] = useState(false)
  const [articleLoading, setArticleLoading] = useState(false)
  const [articlePaymentStatus, setArticlePaymentStatus] = useState('')

  // Demo 2: AI Chat Agents State
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [useRealPayments, setUseRealPayments] = useState(false)
  const [mockWallet, setMockWallet] = useState(null)
  const [pricingConfig, setPricingConfig] = useState({
    apiRequestPrice: '0.001',
    inputTokenPrice: '0.002',
    outputTokenPrice: '0.004'
  })

    // Demo 3: Ecommerce State
  const [selectedProduct, setSelectedProduct] = useState({
    id: 'apple-gift-card',
    name: 'Apple Gift Card',
    price: '0.01',
    image: '/api/placeholder/300/300',
    description: 'Digital Apple Gift Card - Instantly delivered via unique gift code. Perfect for App Store, iTunes, and Apple services purchases.'
  })
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderStatus, setOrderStatus] = useState('')

  // X402 Configuration
  const X402_CONFIG = {
    paymentAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    network: 'sepolia',
    assetAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // USDC on Sepolia
  }

  // AgentMeter Configuration
  const AGENTMETER_CONFIG = {
    projectId: 'hackathon-demo',
    apiKey: 'sk_hackathon_demo_12345'
  }

  // Demo 1: Pay-walled Article Functions
  const handleUnlockArticle = useCallback(async () => {
    setArticleLoading(true)
    setArticlePaymentStatus('Processing payment...')

    try {
      // First try without payment to get HTTP 402 response
      const response = await fetch('http://localhost:4021/api/unlock-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          articleId: 'x402-whitepaper',
          projectId: AGENTMETER_CONFIG.projectId
        })
      })

      if (response.status === 402) {
        // Payment required - show payment details
        const paymentDetails = await response.json()
        setArticlePaymentStatus(`❗ Payment Required: ${paymentDetails.maxAmountRequired} USDC on ${paymentDetails.network}`)
        
        // For demo purposes, simulate payment after 2 seconds
        setTimeout(async () => {
          try {
            setArticlePaymentStatus('💰 Processing payment with X402...')
            
            // Simulate payment with X-Payment-Amount header
            const paymentResponse = await fetch('http://localhost:4021/api/unlock-article', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Payment-Amount': '0.01'
              },
              body: JSON.stringify({
                articleId: 'x402-whitepaper',
                projectId: AGENTMETER_CONFIG.projectId
              })
            })

            if (paymentResponse.ok) {
              setArticleUnlocked(true)
              setArticlePaymentStatus('✅ Payment successful! Article unlocked.')
              
              // Track with AgentMeter
              await fetch('http://localhost:4021/api/agentmeter/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId: AGENTMETER_CONFIG.projectId,
                  agentId: 'article-unlock-agent',
                  eventType: 'article_unlock',
                  cost: 0.01,
                  metadata: { articleId: 'x402-whitepaper' }
                })
              })
            } else {
              setArticlePaymentStatus('❌ Payment verification failed')
            }
          } catch (paymentError) {
            console.error('Payment error:', paymentError)
            setArticlePaymentStatus('❌ Payment processing failed')
          } finally {
            setArticleLoading(false)
          }
        }, 2000)
      } else if (response.ok) {
        // Already unlocked
        setArticleUnlocked(true)
        setArticlePaymentStatus('✅ Article already unlocked!')
        setArticleLoading(false)
      } else {
        setArticlePaymentStatus('❌ Unexpected error occurred')
        setArticleLoading(false)
      }
    } catch (error) {
      console.error('Request failed:', error)
      setArticlePaymentStatus('❌ Network error. Please try again.')
      setArticleLoading(false)
    }
  }, [])

  // Demo 2: AI Chat Functions
  const handleChatSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = { type: 'user', content: chatInput, timestamp: new Date().toISOString() }
    setChatMessages(prev => [...prev, userMessage])
    setChatLoading(true)

    const currentInput = chatInput
    setChatInput('')

    try {
      // Process both OpenAI and DeepSeek responses
      const responses = await Promise.allSettled([
        processAIResponse(currentInput, 'openai'),
        processAIResponse(currentInput, 'deepseek')
      ])

      responses.forEach((result, index) => {
        const provider = index === 0 ? 'openai' : 'deepseek'
        if (result.status === 'fulfilled') {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            provider,
            content: result.value.content,
            tokens: result.value.tokens,
            cost: result.value.cost,
            breakdown: result.value.breakdown,
            showBreakdown: false,
            timestamp: new Date().toISOString()
          }])
        } else {
          setChatMessages(prev => [...prev, {
            type: 'error',
            provider,
            content: `Error from ${provider}: ${result.reason.message}`,
            timestamp: new Date().toISOString()
          }])
        }
      })
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, pricingConfig])

  const processAIResponse = async (input, provider) => {
    // Simulate API call to AI provider
    const response = await fetch('http://localhost:4021/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        provider,
        projectId: AGENTMETER_CONFIG.projectId
      })
    })

    const data = await response.json()
    
    // Calculate costs based on pricing config
    const apiCost = parseFloat(pricingConfig.apiRequestPrice)
    const inputTokenCost = (data.tokensIn / 1000) * parseFloat(pricingConfig.inputTokenPrice)
    const outputTokenCost = (data.tokensOut / 1000) * parseFloat(pricingConfig.outputTokenPrice)
    const totalCost = apiCost + inputTokenCost + outputTokenCost

    // Process payment via X402 (simplified for demo)
    await fetch('http://localhost:4021/api/process-ai-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Amount': totalCost.toFixed(4)
      },
      body: JSON.stringify({
        provider,
        cost: totalCost,
        breakdown: { apiCost, inputTokenCost, outputTokenCost },
        projectId: AGENTMETER_CONFIG.projectId
      })
    })

    // Track with AgentMeter
    await fetch('http://localhost:4021/api/agentmeter/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: AGENTMETER_CONFIG.projectId,
        agentId: `${provider}-chat-agent`,
        eventType: 'chat_completion',
        apiCalls: 1,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        cost: totalCost
      })
    })

    return {
      content: data.content,
      tokens: { in: data.tokensIn, out: data.tokensOut },
      cost: totalCost,
      breakdown: { apiCost, inputTokenCost, outputTokenCost }
    }
  }

  // Handle payment for AI response
  const handlePayForAIResponse = useCallback(async (provider, cost, breakdown) => {
    try {
      const endpoint = useRealPayments ? 
        'http://localhost:4021/api/process-real-x402-payment' : 
        'http://localhost:4021/api/process-ai-payment'

      const paymentBody = {
        provider,
        cost: cost.toFixed(4),
        breakdown,
        projectId: AGENTMETER_CONFIG.projectId,
        amount: cost.toFixed(4),
        resource: `/api/ai-chat/${provider}`,
        description: `AI ${provider} chat processing`,
        useRealPayment: useRealPayments
      }

      // Add wallet details for real payments
      if (useRealPayments) {
        if (!mockWallet) {
          setChatMessages(prev => [...prev, {
            type: 'error',
            content: `❌ Real payments enabled but wallet not loaded. Please wait for wallet to load.`,
            timestamp: new Date().toISOString()
          }])
          return
        }
        
        paymentBody.fromAddress = mockWallet.address
        paymentBody.privateKey = mockWallet.privateKey
        
        console.log('Using wallet:', { address: mockWallet.address, hasPrivateKey: !!mockWallet.privateKey })
      }

      // Process payment
      const paymentResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Amount': cost.toFixed(4)
        },
        body: JSON.stringify(paymentBody)
      })

      const result = await paymentResponse.json()

      if (paymentResponse.ok && result.success) {
        // Add success message to chat
        const message = useRealPayments ? 
          `✅ Real blockchain payment of ${cost.toFixed(4)} USDC processed successfully!\n🔗 Tx: ${result.txHash}\n📦 Block: ${result.blockNumber}` :
          `✅ Simulated payment of ${cost.toFixed(4)} USDC processed successfully for ${provider} agent`

        setChatMessages(prev => [...prev, {
          type: 'payment',
          content: message,
          txHash: result.txHash,
          blockNumber: result.blockNumber,
          timestamp: new Date().toISOString()
        }])
      } else {
        throw new Error(result.error || 'Payment failed')
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'error',
        content: `❌ Payment failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }])
    }
  }, [useRealPayments, mockWallet])

  // Load mock wallet when real payments are enabled
  useEffect(() => {
    if (useRealPayments && !mockWallet) {
      fetch('http://localhost:4021/api/mock-wallet')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMockWallet(data.wallet)
          }
        })
        .catch(err => console.error('Failed to load mock wallet:', err))
    }
  }, [useRealPayments, mockWallet])

  // Demo 3: Ecommerce Functions
  const handlePlaceOrder = useCallback(async () => {
    setOrderLoading(true)
    setOrderStatus('Processing order...')

    try {
      // Process instant purchase with X402 payment
      const response = await fetch('http://localhost:4021/api/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Amount': selectedProduct.price
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          price: selectedProduct.price,
          projectId: AGENTMETER_CONFIG.projectId
        })
      })

      if (response.status === 402) {
        const paymentDetails = await response.json()
        setOrderStatus(`Payment required: ${paymentDetails.maxAmountRequired} USDC`)
        return
      }

      if (response.ok) {
        const orderData = await response.json()
        
        if (orderData.giftCard) {
          setOrderStatus(
            `🎉 Order successful! Your gift card is ready:\n\n` +
            `🎁 Gift Card Code: ${orderData.giftCard.code}\n` +
            `💰 Value: ${orderData.giftCard.value} ${orderData.giftCard.currency}\n` +
            `📅 Expires: ${new Date(orderData.giftCard.expires).toLocaleDateString()}\n` +
            `✅ Status: ${orderData.giftCard.status}\n\n` +
            `Order ID: ${orderData.orderId}`
          )
        } else {
          setOrderStatus(`Order successful! Order ID: ${orderData.orderId}`)
        }
        
        // Track with AgentMeter
        await fetch('http://localhost:4021/api/agentmeter/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: AGENTMETER_CONFIG.projectId,
            agentId: 'ecommerce-agent',
            eventType: 'gift_card_purchase',
            cost: parseFloat(selectedProduct.price),
            metadata: { 
              productId: selectedProduct.id,
              orderId: orderData.orderId,
              giftCardCode: orderData.giftCard?.code
            }
          })
        })
      }
    } catch (error) {
      console.error('Order failed:', error)
      setOrderStatus('Order failed. Please try again.')
    } finally {
      setOrderLoading(false)
    }
  }, [selectedProduct])

  return (
    <div className={styles.hackathonPage}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>🏆 Coinbase Hackathon - AgentMeter Live Demos</h1>
          <p className={styles.subtitle}>
            Experience the future of agent-native payments with X402 + AgentMeter integration
          </p>
          
          <div className={styles.configDisplay}>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>Project ID:</span>
              <code className={styles.configValue}>{AGENTMETER_CONFIG.projectId}</code>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>Payment Network:</span>
              <code className={styles.configValue}>{X402_CONFIG.network}</code>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>USDC Contract:</span>
              <code className={styles.configValue}>{X402_CONFIG.assetAddress}</code>
            </div>
          </div>
        </div>

        {/* Demo 1: Pay-walled Article */}
        <div className={styles.demoSection}>
          <h2 className={styles.demoTitle}>📰 Demo 1: Pay-walled Article Unlock</h2>
          <p className={styles.demoDescription}>
            Unlock the X402 whitepaper with 0.01 USDC payment via X402 protocol
          </p>
          
          <div className={styles.articleCard}>
            <div className={styles.articleHeader}>
              <h3>X402: An Open Standard for Internet-Native Payments</h3>
              <div className={styles.articleMeta}>
                <span>By: Erik Reppel, Ronnie Caspers, Kevin Leffew, Danny Organ</span>
                <span>Coinbase Developer Platform</span>
              </div>
            </div>
            
            <div className={styles.articleContent}>
              {!articleUnlocked ? (
                <div className={styles.paywall}>
                  <div className={styles.previewText}>
                    <p>
                      <strong>Abstract:</strong> x402 is an open payment standard that enables AI agents 
                      and web services to autonomously pay for API access, data, and digital services. 
                      By leveraging the long-reserved HTTP 402 "Payment Required" status code...
                    </p>
                    <div className={styles.blur}>
                      <p>This content is locked. The rapid growth of AI and autonomous systems is reshaping 
                      the internet economy, but one of the major roadblocks to achieving fully autonomous 
                      AI systems is the lack of a payment system that empowers AI Agents to function without 
                      human intervention...</p>
                    </div>
                  </div>
                  
                  <div className={styles.unlockSection}>
                    <div className={styles.priceDisplay}>
                      <span className={styles.price}>0.01 USDC</span>
                      <span className={styles.priceLabel}>to unlock full article</span>
                    </div>
                    
                    <button 
                      className={styles.unlockButton}
                      onClick={handleUnlockArticle}
                      disabled={articleLoading}
                    >
                      {articleLoading ? '⏳ Processing...' : '🔓 Pay to Unlock'}
                    </button>
                    
                    {articlePaymentStatus && (
                      <div className={styles.paymentStatus}>
                        {articlePaymentStatus}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.unlockedContent}>
                  <div className={styles.successMessage}>
                    ✅ Article unlocked! Payment processed via X402 + AgentMeter
                  </div>
                  
                  <div className={styles.fullArticle}>
                    <h4>Motivation</h4>
                    <p>
                      The rapid growth of AI and autonomous systems is reshaping the internet economy, 
                      but one of the major roadblocks to achieving fully autonomous AI systems is the 
                      lack of a payment system that empowers AI Agents to function without human intervention.
                    </p>
                    
                    <h4>How x402 Works</h4>
                    <p>
                      x402 is an open payments protocol developed by Coinbase that enables AI agents to 
                      complete transactions autonomously. It is powered by onchain technology and digital 
                      currencies (primarily stablecoins like USDC) and provides a lightweight, secure, 
                      and instantaneous payment system.
                    </p>
                    
                    <div className={styles.downloadLink}>
                      <a href="https://www.x402.org/x402-whitepaper.pdf" target="_blank" rel="noopener noreferrer">
                        📄 Download Full PDF Whitepaper
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Demo 2: AI Chat Agents */}
        <div className={styles.demoSection}>
          <h2 className={styles.demoTitle}>🤖 Demo 2: Dual AI Chat Agents (OpenAI + DeepSeek)</h2>
          <p className={styles.demoDescription}>
            Chat with both OpenAI and DeepSeek agents simultaneously. Each response is metered and paid via X402.
          </p>
          
          {/* Pricing Configuration */}
          <div className={styles.pricingConfig}>
            <h4>💰 Pricing Configuration</h4>
            <div className={styles.pricingInputs}>
              <div className={styles.priceInput}>
                <label>API Request:</label>
                <input
                  type="number"
                  step="0.001"
                  value={pricingConfig.apiRequestPrice}
                  onChange={(e) => setPricingConfig(prev => ({ ...prev, apiRequestPrice: e.target.value }))}
                />
                <span>USDC</span>
              </div>
              <div className={styles.priceInput}>
                <label>Input Tokens (per 1K):</label>
                <input
                  type="number"
                  step="0.001"
                  value={pricingConfig.inputTokenPrice}
                  onChange={(e) => setPricingConfig(prev => ({ ...prev, inputTokenPrice: e.target.value }))}
                />
                <span>USDC</span>
              </div>
              <div className={styles.priceInput}>
                <label>Output Tokens (per 1K):</label>
                <input
                  type="number"
                  step="0.001"
                  value={pricingConfig.outputTokenPrice}
                  onChange={(e) => setPricingConfig(prev => ({ ...prev, outputTokenPrice: e.target.value }))}
                />
                <span>USDC</span>
              </div>
            </div>
            
            {/* Payment Mode Toggle */}
            <div className={styles.paymentModeSection}>
              <h5>🔧 Payment Mode</h5>
              <div className={styles.paymentToggle}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={useRealPayments}
                    onChange={(e) => setUseRealPayments(e.target.checked)}
                  />
                  <span className={styles.toggleSlider}></span>
                  Enable Real X402 Payments on Sepolia
                </label>
              </div>
              
              {useRealPayments && mockWallet && (
                <div className={styles.walletInfo}>
                  <h6>🏦 Test Wallet (Sepolia)</h6>
                  <div className={styles.walletAddress}>
                    <strong>Address:</strong> {mockWallet.address}
                  </div>
                  <div className={styles.walletBalance}>
                    <strong>Balance:</strong> {mockWallet.balance} USDC
                  </div>
                  <div className={styles.walletNote}>
                    ⚠️ {mockWallet.note}
                  </div>
                </div>
              )}
              
              {useRealPayments && !mockWallet && (
                <div className={styles.loadingWallet}>
                  ⏳ Loading test wallet...
                </div>
              )}
            </div>
          </div>
          
          {/* Chat Interface */}
          <div className={styles.chatContainer}>
            <div className={styles.chatMessages}>
              {chatMessages.length === 0 ? (
                <div className={styles.chatWelcome}>
                  <p>👋 Welcome! Ask a question to see responses from both OpenAI and DeepSeek agents.</p>
                  <p>Each response will be automatically metered and charged based on your pricing configuration.</p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={`${styles.message} ${styles[message.type]}`}>
                    {message.type === 'user' ? (
                      <div className={styles.userMessage}>
                        <strong>You:</strong> {message.content}
                      </div>
                    ) : message.type === 'assistant' ? (
                      <div className={styles.assistantMessage}>
                        <div className={styles.agentHeader}>
                          <span className={styles.agentName}>
                            {message.provider === 'openai' ? '🧠 OpenAI' : '🚀 DeepSeek'}
                          </span>
                          <div className={styles.costSection}>
                            <span 
                              className={styles.costDisplay}
                              onClick={() => {
                                const updatedMessages = [...chatMessages]
                                const messageIndex = chatMessages.findIndex(m => m === message)
                                updatedMessages[messageIndex] = {
                                  ...message,
                                  showBreakdown: !message.showBreakdown
                                }
                                setChatMessages(updatedMessages)
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              Cost: ${message.cost.toFixed(4)} USDC {message.showBreakdown ? '▼' : '▶'}
                            </span>
                            {message.showBreakdown && (
                              <div className={styles.costBreakdown}>
                                <div className={styles.breakdownItem}>
                                  Pay for agent request: ${message.breakdown.apiCost.toFixed(4)} USDC
                                </div>
                                <div className={styles.breakdownItem}>
                                  Pay for input tokens: ${message.breakdown.inputTokenCost.toFixed(4)} USDC
                                </div>
                                <div className={styles.breakdownItem}>
                                  Pay for output tokens: ${message.breakdown.outputTokenCost.toFixed(4)} USDC
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={styles.agentResponse}>
                          {message.content}
                        </div>
                        <div className={styles.tokenInfo}>
                          📊 Tokens: {message.tokens.in} in / {message.tokens.out} out
                        </div>
                        <div className={styles.paymentSection}>
                          <button 
                            className={styles.payToContinueButton}
                            onClick={() => handlePayForAIResponse(message.provider, message.cost, message.breakdown)}
                          >
                            💳 Pay to Continue (${message.cost.toFixed(4)} USDC)
                          </button>
                        </div>
                      </div>
                    ) : message.type === 'payment' ? (
                      <div className={styles.paymentMessage}>
                        {message.content}
                      </div>
                    ) : (
                      <div className={styles.errorMessage}>
                        <strong>❌ {message.provider}:</strong> {message.content}
                      </div>
                    )}
                  </div>
                ))
              )}
              {chatLoading && (
                <div className={styles.loadingMessage}>
                  <div className={styles.loadingSpinner}>⏳</div>
                  <span>Getting responses from both agents...</span>
                </div>
              )}
            </div>
            
            <form className={styles.chatForm} onSubmit={handleChatSubmit}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question to both AI agents..."
                className={styles.chatInput}
                disabled={chatLoading}
              />
              <button 
                type="submit" 
                className={styles.chatSubmit}
                disabled={chatLoading || !chatInput.trim()}
              >
                {chatLoading ? '⏳' : '💬'}
              </button>
            </form>
          </div>
        </div>

        {/* Demo 3: Gift Card Platform */}
        <div className={styles.demoSection}>
          <h2 className={styles.demoTitle}>🎁 Demo 3: InstantPay Gift Card Platform</h2>
          <p className={styles.demoDescription}>
            Purchase gift cards instantly with X402 payments - automatically receive a unique gift card code upon payment.
          </p>
          
          <div className={styles.productCard}>
            <div className={styles.productImage}>
              <img src={selectedProduct.image} alt={selectedProduct.name} />
            </div>
            
            <div className={styles.productInfo}>
              <h3 className={styles.productName}>{selectedProduct.name}</h3>
              <p className={styles.productDescription}>{selectedProduct.description}</p>
              
              <div className={styles.productPricing}>
                <span className={styles.productPrice}>{selectedProduct.price} USDC</span>
                <span className={styles.priceNote}>Instant gift card delivery via X402 on Sepolia</span>
              </div>
              
              <div className={styles.orderSection}>
                <button 
                  className={styles.orderButton}
                  onClick={handlePlaceOrder}
                  disabled={orderLoading}
                >
                  {orderLoading ? '⏳ Generating Gift Card...' : '🎁 Buy Gift Card'}
                </button>
                
                {orderStatus && (
                  <div className={styles.orderStatus}>
                    {orderStatus}
                  </div>
                )}
              </div>
              
              <div className={styles.paymentDetails}>
                <h4>Payment Details:</h4>
                <ul>
                  <li>Network: Sepolia Testnet</li>
                  <li>Token: USDC ({X402_CONFIG.assetAddress})</li>
                  <li>Recipient: {X402_CONFIG.paymentAddress}</li>
                  <li>Settlement: ~200ms via X402</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Info */}
        <div className={styles.integrationInfo}>
          <h2>🔧 Integration Details</h2>
          <div className={styles.integrationGrid}>
            <div className={styles.integrationCard}>
              <h4>X402 Protocol</h4>
              <ul>
                <li>HTTP 402 "Payment Required" status</li>
                <li>Instant USDC payments on Sepolia</li>
                <li>No accounts or subscriptions needed</li>
                <li>Agent-native payment flow</li>
              </ul>
            </div>
            
            <div className={styles.integrationCard}>
              <h4>AgentMeter Tracking</h4>
              <ul>
                <li>Real-time usage metering</li>
                <li>Token-level cost tracking</li>
                <li>Multi-agent analytics</li>
                <li>Revenue optimization</li>
              </ul>
            </div>
            
            <div className={styles.integrationCard}>
              <h4>CDP Integration</h4>
              <ul>
                <li>Project-level wallet management</li>
                <li>Gasless transaction support</li>
                <li>Smart account abstraction</li>
                <li>Policy governance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoinbaseHackathon