<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import React, { useEffect, useState, useCallback, Fragment, useRef } from 'react'
import { Link } from 'react-router-dom'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { withRouter } from 'utils/withRouter'
import classNames from 'classnames'
// import { CdpClient } from '@coinbase/cdp-sdk'
import { createWalletClient, custom, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
import { API_URL } from 'constants/env'
import styles from './style.css'

const Chat = ({ actions }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4')
  const [walletAddress, setWalletAddress] = useState('')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletClient, setWalletClient] = useState(null)
  const [walletBalance, setWalletBalance] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const connectWallet = useCallback(async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        console.error('MetaMask is not installed')
        alert('Please install MetaMask to use this feature')
        return
      }

      // Request account access first
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]

      if (address) {
        // Create a custom account object that x402-fetch expects
        const account = {
          address: address,
          type: 'json-rpc',
          // Add required signing methods that x402-fetch needs
          signMessage: async (message) => {
            return await window.ethereum.request({
              method: 'personal_sign',
              params: [message, address]
            })
          },
          signTypedData: async (typedData) => {
            return await window.ethereum.request({
              method: 'eth_signTypedData_v4',
              params: [address, JSON.stringify(typedData)]
            })
          },
          signTransaction: async (transaction) => {
            return await window.ethereum.request({
              method: 'eth_signTransaction',
              params: [transaction]
            })
          }
        }

        // Create wallet client with the custom account
        const client = createWalletClient({
          chain: baseSepolia,
          transport: custom(window.ethereum),
          account: account
        })

        setWalletAddress(address)
        setWalletClient(client)
        setIsWalletConnected(true)
        console.log('Wallet connected:', address)
        console.log('Wallet client:', client)
        console.log('Wallet client account:', client.account)

        // Get wallet balance
        const balance = await getWalletBalance(address)

        // Add connection message to chat
        const connectionMessage = {
          id: Date.now(),
          type: 'assistant',
          content: `Wallet connected successfully! Address: ${address.slice(0, 6)}...${address.slice(-4)} | Balance: ${balance} ETH`,
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages(prev => [...prev, connectionMessage])
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet: ' + error.message)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setWalletAddress('')
    setWalletClient(null)
    setIsWalletConnected(false)
    setWalletBalance('')
    console.log('Wallet disconnected')

    // Add disconnection message to chat
    const disconnectionMessage = {
      id: Date.now(),
      type: 'assistant',
      content: 'Wallet disconnected successfully.',
      timestamp: new Date().toLocaleTimeString()
    }
    setMessages(prev => [...prev, disconnectionMessage])
  }, [])

  const getWalletBalance = useCallback(async (address) => {
    try {
      console.log('Getting balance for address:', address)
      console.log('Wallet client:', walletClient)

      // Always use public client for getting balance
      console.log('Using public client for balance...')
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org')
      })

      const balance = await publicClient.getBalance({ address })
      console.log('Raw balance from public client:', balance)
      const balanceInEth = (parseInt(balance) / Math.pow(10, 18)).toFixed(4)
      console.log('Balance in ETH from public client:', balanceInEth)
      setWalletBalance(balanceInEth)
      return balanceInEth

    } catch (error) {
      console.error('Error fetching wallet balance:', error)
      console.error('Error details:', error.message)
      setWalletBalance('N/A')
      return 'N/A'
    }
  }, [walletClient])

  const refreshBalance = useCallback(async () => {
    if (walletAddress) {
      await getWalletBalance(walletAddress)
    }
  }, [walletAddress, getWalletBalance])

  const testWalletConnection = useCallback(async () => {
    if (!walletClient) {
      console.log('No wallet client available')
      return
    }

    try {
      console.log('Testing wallet connection...')
      console.log('Wallet client:', walletClient)
      console.log('Wallet client account:', walletClient.account)
      console.log('Available methods on wallet client:', Object.getOwnPropertyNames(Object.getPrototypeOf(walletClient)))
      console.log('Available properties on wallet client:', Object.keys(walletClient))

      // Test getting the current account
      let address
      if (walletClient.account && walletClient.account.address) {
        address = walletClient.account.address
        console.log('✅ Found address in wallet client account:', address)
      } else if (walletClient.requestAddresses) {
        const [addr] = await walletClient.requestAddresses()
        address = addr
        console.log('✅ Got address via requestAddresses:', address)
      } else {
        throw new Error('Cannot get wallet address')
      }
      console.log('Current address:', address)

      // Test getting the chain ID
      let chainId
      if (walletClient.getChainId) {
        chainId = await walletClient.getChainId()
      } else if (walletClient.chain) {
        chainId = walletClient.chain.id
      } else {
        throw new Error('Cannot get chain ID')
      }
      console.log('Chain ID:', chainId)
      console.log('Expected chain ID for base-sepolia:', baseSepolia.id)

      // Test getting balance using public client
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org')
      })
      const balance = await publicClient.getBalance({ address })
      console.log('Balance:', balance)

      // Test if account is properly set up for x402
      if (walletClient.account && walletClient.account.address) {
        console.log('✅ Account properly configured for x402')
        console.log('Account address:', walletClient.account.address)
        console.log('Account type:', walletClient.account.type)
        console.log('Account has signMessage:', typeof walletClient.account.signMessage === 'function')
        console.log('Account has signTypedData:', typeof walletClient.account.signTypedData === 'function')
        console.log('Account has signTransaction:', typeof walletClient.account.signTransaction === 'function')

        alert(`Wallet test successful!\nAddress: ${address}\nChain ID: ${chainId}\nBalance: ${balance}\n✅ Account ready for x402 payments`)
      } else {
        console.log('❌ Account not properly configured for x402')
        alert(`Wallet test successful!\nAddress: ${address}\nChain ID: ${chainId}\nBalance: ${balance}\n❌ Account not ready for x402 payments`)
      }
    } catch (error) {
      console.error('Wallet test failed:', error)
      alert('Wallet test failed: ' + error.message)
    }
  }, [walletClient])

  useEffect(() => {
    const connect = async () => {
      console.log('connect')

      // Auto-connect if wallet was previously connected
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            const address = accounts[0]

            // Create a custom account object that x402-fetch expects
            const account = {
              address: address,
              type: 'json-rpc',
              // Add required signing methods that x402-fetch needs
              signMessage: async (message) => {
                return await window.ethereum.request({
                  method: 'personal_sign',
                  params: [message, address]
                })
              },
              signTypedData: async (typedData) => {
                return await window.ethereum.request({
                  method: 'eth_signTypedData_v4',
                  params: [address, JSON.stringify(typedData)]
                })
              },
              signTransaction: async (transaction) => {
                return await window.ethereum.request({
                  method: 'eth_signTransaction',
                  params: [transaction]
                })
              }
            }

            // Create wallet client with the custom account
            const client = createWalletClient({
              chain: baseSepolia,
              transport: custom(window.ethereum),
              account: account
            })

            setWalletAddress(address)
            setWalletClient(client)
            setIsWalletConnected(true)
            console.log('Auto-connected to wallet:', address)
            console.log('Wallet client:', client)
            console.log('Wallet client account:', client.account)

            // Get wallet balance
            getWalletBalance(address)
          }
        } catch (error) {
          console.error('Error auto-connecting wallet:', error)
        }
      }
    }

    connect()
  }, [])

  // Listen for wallet account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet()
        } else if (accounts[0] !== walletAddress) {
          // User switched accounts
          setWalletAddress(accounts[0])
          console.log('Wallet account changed:', accounts[0])

          // Get new wallet balance
          const balance = await getWalletBalance(accounts[0])

          // Add account change message to chat
          const accountChangeMessage = {
            id: Date.now(),
            type: 'assistant',
            content: `Wallet account changed to: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)} | Balance: ${balance} ETH`,
            timestamp: new Date().toLocaleTimeString()
          }
          setMessages(prev => [...prev, accountChangeMessage])
        }
      }

      const handleChainChanged = (chainId) => {
        // Reload the page when chain changes
        window.location.reload()
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [walletAddress, disconnectWallet])

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Check if wallet is connected
    if (!isWalletConnected || !walletClient) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Please connect your wallet first to make API calls.',
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
      return
    }

    try {
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient)

      // Prepare messages for OpenAI API
      const messages = [
        { role: 'user', content: userMessage.content }
      ]

      const response = await fetchWithPayment(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          model: selectedModel,
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (response.status === 402) {
        // Payment required
        const paymentData = await response.json()
        console.log('Payment required:', paymentData)

        const paymentMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: `Payment required to access chat API. Cost: $0.001. Please complete the payment to continue.`,
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages(prev => [...prev, paymentMessage])
      } else if (response.ok) {
        const body = await response.json()
        const paymentResponse = decodeXPaymentResponse(response.headers.get('x-payment-response'))
        console.log('Payment response:', paymentResponse)

        const aiResponse = {
          id: Date.now() + 1,
          type: 'assistant',
          content: body.response || 'No response received',
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages(prev => [...prev, aiResponse])
      } else {
        const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          content: `API Error: ${errorBody.error || response.statusText}`,
          timestamp: new Date().toLocaleTimeString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error making API call:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, isWalletConnected, walletClient, selectedModel])

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        type: 'assistant',
        content: 'Chat cleared. How can I help you today?',
        timestamp: new Date().toLocaleTimeString()
      }
    ])
  }

  return (
    <Fragment>
      <div className={styles.chat}>
        <div className={styles.container}>
          {/* Chat Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>AI Chat Assistant</h1>
              <p className={styles.subtitle}>Powered by AgentMeter</p>
            </div>
            <div className={styles.headerRight}>
              {/* Wallet Connection */}
              <div className={styles.walletSection}>
                {isWalletConnected ? (
                  <div className={styles.walletInfo}>
                    <span className={styles.walletAddress}>
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                    {walletBalance && (
                      <span className={styles.walletBalance}>
                        {walletBalance} ETH
                        <button onClick={refreshBalance} className={styles.refreshButton} title="Refresh balance">
                          🔄
                        </button>
                      </span>
                    )}
                    <button onClick={disconnectWallet} className={styles.disconnectButton}>
                      🔌 Disconnect
                    </button>
                  </div>
                ) : (
                  <button onClick={connectWallet} className={styles.connectButton}>
                    🔗 Connect Wallet
                  </button>
                )}
              </div>

              {isWalletConnected && (
                <button
                  onClick={async () => {
                    console.log('Testing payment flow...')
                    console.log('Wallet client:', walletClient)
                    console.log('Wallet client account:', walletClient.account)

                    if (!walletClient) {
                      alert('❌ Wallet client not available. Please connect your wallet.')
                      return
                    }

                    if (!walletClient.account || !walletClient.account.address) {
                      alert('❌ Wallet client not properly configured. Please reconnect your wallet.')
                      return
                    }

                    const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient)
                    try {
                      const response = await fetchWithPayment(`${API_URL}/chat`, {
                        method: "GET",
                      })
                      console.log('Test response status:', response.status)
                      if (response.status === 402) {
                        const paymentData = await response.json()
                        console.log('Test payment data:', paymentData)
                        alert('Payment required! Check console for details.')
                      } else {
                        const body = await response.json()
                        console.log('Test success:', body)
                        alert('Payment successful! Check console for details.')
                      }
                    } catch (error) {
                      console.error('Test error:', error)
                      alert('Test failed: ' + error.message)
                    }
                  }}
                  className={styles.testButton}
                >
                  🧪 Test Payment
                </button>
              )}

              {isWalletConnected && (
                <button
                  onClick={testWalletConnection}
                  className={styles.testButton}
                >
                  🔍 Test Wallet
                </button>
              )}

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={styles.modelSelect}
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude-3</option>
              </select>
              <button onClick={clearChat} className={styles.clearButton}>
                🗑️ Clear Chat
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className={styles.messagesContainer}>
            <div className={styles.messages}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={classNames(
                    styles.message,
                    message.type === 'user' ? styles.userMessage : styles.assistantMessage
                  )}
                >
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageAuthor}>
                        {message.type === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className={styles.messageTime}>{message.timestamp}</span>
                    </div>
                    <div className={styles.messageText}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className={classNames(styles.message, styles.assistantMessage)}>
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageAuthor}>AI Assistant</span>
                      <span className={styles.messageTime}>Typing...</span>
                    </div>
                    <div className={styles.typingIndicator}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Container */}
          <div className={styles.inputContainer}>
            <div className={styles.inputWrapper}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                className={styles.input}
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={classNames(styles.sendButton, {
                  [styles.sendButtonDisabled]: !inputValue.trim() || isLoading
                })}
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            <div className={styles.inputFooter}>
              <span className={styles.inputHint}>
                Press Enter to send • Shift+Enter for new line
              </span>
              <span className={styles.modelInfo}>
                Using: {selectedModel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default withRouter(
  connect(
    state => ({

    }),
    dispatch => ({
      actions: bindActionCreators({

      }, dispatch)
    })
  )(Chat)
)
=======
 
>>>>>>> Stashed changes
=======
 
>>>>>>> Stashed changes
=======
 
>>>>>>> Stashed changes
