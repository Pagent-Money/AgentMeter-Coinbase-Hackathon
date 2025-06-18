import React, { useEffect, useState, useCallback, Fragment } from 'react'
import { Link } from 'react-router-dom'
// import { CdpClient } from '@coinbase/cdp-sdk'
import { config } from 'dotenv'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
import classNames from 'classnames'
import styles from './style.css'

config()

const Landing = () => {
  const createWallet = useCallback(() => {
    const start = async () => {
      const account = privateKeyToAccount(process.env.PRIVATE_KEY)
      console.log('createWallet', account)

      const fetchWithPayment = wrapFetchWithPayment(fetch, account)

      fetchWithPayment(`http://localhost:4021/weather`, { method: 'GET' }).then(async response => {
        const body = await response.json()
        console.log(body)

        const paymentResponse = decodeXPaymentResponse(response.headers.get('x-payment-response'))
        console.log(paymentResponse)
      }).catch(error => {
        console.log('error', error.message)
      })
    }

    start()
  }, [])

  return (
    <Fragment>
      <div className={styles.landing}>
        <section className={styles.banner}>
          <div className={styles.container}>
            <h1>AgentMeter</h1>
            <p>Metering & Billing your Agents with x402 enabled stablecoin micropayment.</p>
          </div>
        </section>

        {/* Agent Meter SDK Section */}
        <section id="sdk" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionContent}>
              <h2>Agent Meter SDK</h2>
              <p>
                Integrate AgentMeter seamlessly into your Langchain-compatible applications with our Python SDK.
                Track agent usage, monitor costs, and enable automatic billing with just a few lines of code.
              </p>

              <div className={styles.codeBlock}>
                <pre>{`pip install agentmeter-sdk

# Initialize with your AM-Keys
from agentmeter import AgentMeter

# Set up your agent meter
meter = AgentMeter(
    api_key="your-am-key-here",
    agent_id="your-agent-id"
)

# Track your agent usage
with meter.track_session() as session:
    # Your Langchain agent code here
    response = agent.run("What's the weather today?")

    # Usage automatically tracked and billed
    session.log_completion(
        tokens_used=150,
        model="gpt-4",
        cost=0.003
    )`}</pre>
              </div>

              <div className={styles.features}>
                <div className={styles.featureCard}>
                  <h3>🔑 Easy Authentication</h3>
                  <p>Secure API key-based authentication with your AM-Keys from the business portal.</p>
                </div>
                <div className={styles.featureCard}>
                  <h3>📊 Automatic Tracking</h3>
                  <p>Seamlessly track token usage, API calls, and costs without manual intervention.</p>
                </div>
                <div className={styles.featureCard}>
                  <h3>🔗 Langchain Compatible</h3>
                  <p>Drop-in integration with existing Langchain workflows and agents.</p>
                </div>
              </div>

              <p>
                <strong>Get Started:</strong> Visit the AgentMeter Business Portal to obtain your AM-Keys
                and set up billing for your agents.
              </p>

              <a href="#portal" className={styles.button}>Get AM-Keys →</a>
              <a href="#" className={classNames(styles.button, styles.buttonSecondary)}>View Documentation</a>
            </div>
          </div>
        </section>

        {/* Business Portal Section */}
        <section id="portal" className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionContent}>
              <h2>AgentMeter Business Portal</h2>
              <p>
                The comprehensive platform for agent producers to manage, monitor, and monetize their AI agents.
                Set up pricing models, track usage analytics, and automate billing with x402 micropayments.
              </p>

              <div className={styles.features}>
                <div className={styles.featureCard}>
                  <h3>📈 Usage Analytics</h3>
                  <p>Real-time dashboards showing agent usage, performance metrics, and revenue analytics across all your registered agents.</p>
                </div>
                <div className={styles.featureCard}>
                  <h3>💰 Flexible Pricing</h3>
                  <p>Set up custom pricing models: per-token, per-request, subscription-based, or hybrid models that fit your business needs.</p>
                </div>
                <div className={styles.featureCard}>
                  <h3>🔄 Auto Billing</h3>
                  <p>Automated billing and payments using x402 protocol with stablecoin micropayments for instant, low-cost transactions.</p>
                </div>
                <div className={styles.featureCard}>
                  <h3>🛡️ Access Control</h3>
                  <p>Manage API keys, set usage limits, and control access to your agents with granular permission settings.</p>
                </div>
                <div className={styles.featureCard}>
                  <h3>🔔 Smart Alerts</h3>
                  <p>Get notified about usage spikes, billing events, API errors, and performance issues in real-time.</p>
                </div>
                <div className={styles.featureCard}>
                  <h3>📊 Revenue Optimization</h3>
                  <p>AI-powered insights and recommendations to optimize pricing and maximize revenue from your agents.</p>
                </div>
              </div>

              <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1f2937' }}>Key Features Highlights:</h3>
                <ul style={{ textAlign: 'left', maxWidth: '600px', color: '#1f2937', margin: '0 auto' }}>
                  <li>✅ Multi-agent management dashboard</li>
                  <li>✅ Real-time usage monitoring and cost tracking</li>
                  <li>✅ Automated x402 stablecoin micropayments</li>
                  <li>✅ Custom pricing models and rate limiting</li>
                  <li>✅ API key management and access controls</li>
                  <li>✅ Revenue analytics and forecasting</li>
                  <li>✅ Integration webhooks and notifications</li>
                  <li>✅ White-label options for enterprise customers</li>
                </ul>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <a href="#" className={styles.button} style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                  Login to Portal
                </a>
                <a href="#" className={classNames(styles.button, styles.buttonSecondary)} style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
                  Create Account
                </a>
              </div>

              <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
                New to AgentMeter? Start with our free tier that includes up to 10,000 API calls per month.
              </p>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className={styles.section} style={{ backgroundColor: '#1f2937', color: 'white' }}>
          <div className={styles.container}>
            <div className={styles.sectionContent}>
              <h2 style={{ color: 'white' }}>Ready to Start Metering Your Agents?</h2>
              <p style={{ color: '#d1d5db' }}>
                Join hundreds of AI developers already using AgentMeter to monetize their agents
                with transparent, automated billing.
              </p>
              <div style={{ marginTop: '2rem' }}>
                <a href="#portal" className={styles.button} style={{ marginRight: '1rem' }}>
                  Get Started Free
                </a>
                <a href="#" className={classNames(styles.button, styles.buttonSecondary)}>
                  Schedule Demo
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Fragment>
  )
}

export default Landing
