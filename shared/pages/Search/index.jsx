import React, { useEffect, useState, useCallback, Fragment, useRef } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { withRouter } from 'utils/withRouter'
import classNames from 'classnames'
import { createWalletClient, custom, createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { wrapFetchWithPayment } from 'x402-fetch'
import { API_URL } from 'constants/env'
import styles from './style.css'

const Search = ({ actions }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletClient, setWalletClient] = useState(null)
  const [walletBalance, setWalletBalance] = useState('')
  const resultsEndRef = useRef(null)

  const scrollToBottom = () => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [results])

  const connectWallet = useCallback(async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use this feature')
        return
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const address = accounts[0]
      if (address) {
        const account = {
          address: address,
          type: 'json-rpc',
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
        const client = createWalletClient({
          chain: baseSepolia,
          transport: custom(window.ethereum),
          account: account
        })
        setWalletAddress(address)
        setWalletClient(client)
        setIsWalletConnected(true)
        const balance = await getWalletBalance(address)
        setResults(prev => [
          ...prev,
          { type: 'info', content: `Wallet connected! Address: ${address.slice(0, 6)}...${address.slice(-4)} | Balance: ${balance} ETH` }
        ])
      }
    } catch (error) {
      alert('Failed to connect wallet: ' + error.message)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setWalletAddress('')
    setWalletClient(null)
    setIsWalletConnected(false)
    setWalletBalance('')
    setResults(prev => [
      ...prev,
      { type: 'info', content: 'Wallet disconnected successfully.' }
    ])
  }, [])

  const getWalletBalance = useCallback(async (address) => {
    try {
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http('https://sepolia.base.org')
      })
      const balance = await publicClient.getBalance({ address })
      const balanceInEth = (parseInt(balance) / Math.pow(10, 18)).toFixed(4)
      setWalletBalance(balanceInEth)
      return balanceInEth
    } catch (error) {
      setWalletBalance('N/A')
      return 'N/A'
    }
  }, [])

  const refreshBalance = useCallback(async () => {
    if (walletAddress) {
      await getWalletBalance(walletAddress)
    }
  }, [walletAddress, getWalletBalance])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || isLoading) return
    setIsLoading(true)
    setResults([])
    if (!isWalletConnected || !walletClient) {
      setResults([{ type: 'error', content: 'Please connect your wallet first to make search requests.' }])
      setIsLoading(false)
      return
    }
    try {
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient)
      const response = await fetchWithPayment(`${API_URL}/llm-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      })
      if (response.status === 402) {
        setResults([{ type: 'error', content: 'Payment required to access LLM Search API. Please complete the payment to continue.' }])
      } else if (response.ok) {
        const body = await response.json()
        setResults(body.results || [])
      } else {
        const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }))
        setResults([{ type: 'error', content: `API Error: ${errorBody.error || response.statusText}` }])
      }
    } catch (error) {
      setResults([{ type: 'error', content: `Error: ${error.message}` }])
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, isLoading, isWalletConnected, walletClient])

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <Fragment>
      <div className={styles.searchRoot}>
        <div className={styles.searchContainer}>
          {/* Header */}
          <div className={styles.searchHeader}>
            <h1 className={styles.searchTitle}>Search</h1>
            <p className={styles.searchSubtitle}>Search with Large Language Models (LLMs) - Powered by AgentMeter</p>
            <div className={styles.searchWallet}>
              {isWalletConnected ? (
                <>
                  <span className={styles.searchWalletAddress}>
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  {walletBalance && (
                    <span className={styles.searchWalletBalance}>
                      {walletBalance} ETH
                      <button onClick={refreshBalance} className={styles.searchRefreshButton} title="Refresh balance">
                        🔄
                      </button>
                    </span>
                  )}
                  <button onClick={disconnectWallet} className={styles.searchDisconnectButton}>
                    Disconnect
                  </button>
                </>
              ) : (
                <button onClick={connectWallet} className={styles.searchConnectButton}>
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className={styles.searchSearchBar}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your search query here... (Press Enter to search)"
              className={styles.searchInput}
              disabled={isLoading}
            />
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isLoading}
              className={styles.searchSearchButton}
            >
              {isLoading ? '⏳' : 'Search'}
            </button>
          </div>

          {/* Results */}
          <div className={styles.searchResults}>
            {results.map((result, idx) => (
              <div
                key={idx}
                className={classNames(
                  styles.searchResult,
                  result.type === 'error' && styles.systemResult
                )}
              >
                {typeof result.content === 'string' ? result.content : JSON.stringify(result.content)}
              </div>
            ))}
            <div ref={resultsEndRef} />
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default withRouter(
  connect(
    state => ({}),
    dispatch => ({
      actions: bindActionCreators({}, dispatch)
    })
  )(Search)
) 