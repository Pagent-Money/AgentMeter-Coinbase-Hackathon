const { createWalletClient, createPublicClient, http, parseEther, formatEther, encodeFunctionData } = require('viem')
const { sepolia } = require('viem/chains')
const { privateKeyToAccount } = require('viem/accounts')

// X402 Payment Configuration for Sepolia
const X402_CONFIG = {
  network: 'sepolia',
  paymentAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC on Sepolia
  rpcUrl: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' // Public Sepolia RPC
}

// USDC Contract ABI (minimal for transfer)
const USDC_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  }
]

/**
 * Process real X402 payment on Sepolia testnet
 * @param {Object} paymentDetails 
 * @param {string} paymentDetails.fromAddress - Sender's address
 * @param {string} paymentDetails.privateKey - Sender's private key
 * @param {string} paymentDetails.amount - Amount in USDC (string)
 * @param {string} paymentDetails.resource - Resource being paid for
 * @returns {Object} Payment result
 */
async function processX402Payment({ fromAddress, privateKey, amount, resource }) {
  try {
    // Validate inputs
    if (!fromAddress || !privateKey || !amount) {
      throw new Error('Missing required payment parameters')
    }

    // Validate private key format
    if (typeof privateKey !== 'string' || !privateKey.startsWith('0x') || privateKey.length !== 66) {
      throw new Error(`Invalid private key format. Expected hex string starting with 0x, got: ${typeof privateKey} "${String(privateKey).substring(0, 10)}..."`)
    }

    console.log('Processing X402 payment:', { fromAddress, amount, hasPrivateKey: !!privateKey, privateKeyLength: privateKey.length })

    // Create clients
    const account = privateKeyToAccount(privateKey)
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(X402_CONFIG.rpcUrl)
    })
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(X402_CONFIG.rpcUrl)
    })

    // Convert amount to USDC units (6 decimals)
    const amountInUSDC = BigInt(Math.floor(parseFloat(amount) * 1000000))

    // Prepare transaction data
    const txData = {
      account,
      to: X402_CONFIG.usdcContract,
      data: encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [X402_CONFIG.paymentAddress, amountInUSDC]
      })
    }

    // Estimate gas using public client
    const gasEstimate = await publicClient.estimateGas(txData)

    // Send transaction using wallet client
    const txHash = await walletClient.sendTransaction({
      ...txData,
      gas: gasEstimate,
      gasPrice: parseEther('0.000000020') // 20 gwei for Sepolia
    })

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    return {
      success: true,
      txHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status,
      amount,
      currency: 'USDC',
      network: 'sepolia',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('X402 Payment failed:', error)
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Verify X402 payment by checking transaction on blockchain
 * @param {string} txHash - Transaction hash
 * @returns {Object} Verification result
 */
async function verifyX402Payment(txHash) {
  try {
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(X402_CONFIG.rpcUrl)
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    
    return {
      verified: receipt.status === 'success',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Payment verification failed:', error)
    return {
      verified: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Generate X402 payment request for HTTP 402 response
 * @param {string} amount - Amount in USDC
 * @param {string} resource - Resource path
 * @param {string} description - Payment description
 * @returns {Object} X402 payment request
 */
function generateX402PaymentRequest(amount, resource, description) {
  return {
    maxAmountRequired: amount,
    resource,
    description,
    payTo: X402_CONFIG.paymentAddress,
    asset: X402_CONFIG.usdcContract,
    network: X402_CONFIG.network,
    metadata: {
      protocol: 'x402',
      version: '1.0',
      chainId: sepolia.id,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Mock wallet for testing (DO NOT use in production)
 * @returns {Object} Mock wallet details
 */
function getMockWallet() {
  return {
    address: '0x742d35cC6435C0532C8C4b0CA14b9d06b7E1b1e6',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Test private key
    balance: '1000.0' // Mock balance
  }
}

module.exports = {
  processX402Payment,
  verifyX402Payment,
  generateX402PaymentRequest,
  getMockWallet,
  X402_CONFIG
} 