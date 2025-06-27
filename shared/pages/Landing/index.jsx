import React, { useEffect, useState, useCallback, Fragment } from 'react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import styles from './style.css'

const Landing = () => {
  const [animatedMetrics, setAnimatedMetrics] = useState({
    requests: 0,
    tokens: 0,
    money: 0
  });

  useEffect(() => {
    const targets = { requests: 5000, tokens: 130000, money: 1340000 };
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      setAnimatedMetrics({
        requests: Math.floor(targets.requests * progress),
        tokens: Math.floor(targets.tokens * progress),
        money: Math.floor(targets.money * progress)
      });
      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedMetrics(targets);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, []);

  return (
    <Fragment>
      <div className={styles.landing}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroBackground}>
            <div className={styles.heroGrid}></div>
          </div>
          <div className={styles.container}>
            <div className={styles.heroContent}>
              <div className={styles.heroLeft}>
                <div className={styles.badge}>
                  Coinbase x402 & cdp wallet Now Live.
                </div>
                <h1 className={styles.heroTitle}>
                  Agent-native micropayments on stablecoin.
                </h1>
                <p className={styles.heroDescription}>
                  Igniting the Agent Economy on Crypto Payment Rails.
                </p>
                <div className={styles.heroButtons}>
                  <Link to="/register" className={styles.primaryButton}>
                    Start Building Free
                    <span className={styles.buttonIcon}>→</span>
                  </Link>
                  <a href="#demo" className={styles.secondaryButton}>
                    <span className={styles.playIcon}>▶</span>
                    Watch Demo
                  </a>
                </div>
                <div className={styles.trustedBy}>
                  <span>Integrated with</span>
                  <div className={styles.logoGrid}>
                    <div className={styles.logo}>Coinbase AgentKit</div>
                    <div className={styles.logo}>Langchain</div>
                    <div className={styles.logo}>OpenAI Agent SDK</div>
                    <div className={styles.logo}>Google Agent ADK</div>
                    <div className={styles.logo}>Other AI frameworks</div>
                  </div>
                </div>
              </div>
              <div className={styles.heroRight}>
                <div className={styles.dashboardPreview}>
                  <div className={styles.previewHeader}>
                    <div className={styles.previewDots}>
                      <span></span><span></span><span></span>
                    </div>
                    <span>Meter your agent business</span>
                  </div>
                  <div className={styles.previewContent}>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>APIs & function calls</span>
                      <span className={styles.metricValue}>{animatedMetrics.requests.toLocaleString()}</span>
                      <span className={styles.metricGrowth}>Connect your API services to global market.</span>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Agents & LLMs tokens</span>
                      <span className={styles.metricValue}>{animatedMetrics.tokens.toLocaleString()}</span>
                      <span className={styles.metricGrowth}>Monetize your agent business in native method.</span>
                    </div>
                    <div className={styles.metricCard}>
                      <span className={styles.metricLabel}>Money flows in stablecoin</span>
                      <span className={styles.metricValue}>${animatedMetrics.money.toLocaleString()}</span>
                      <span className={styles.metricGrowth}>Crypto thriving AI economy.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2>What is AgentMeter?</h2>
              <p>The first agent-native financial infrastructure combining Coinbase CDP wallets with X402 micropayments to power the AI economy.</p>
            </div>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🏦</div>
                <h3>Project-Level Wallets</h3>
                <p>Each project gets its own CDP smart account where all agent revenue automatically flows together.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>💰</div>
                <h3>Automatic Micropayments</h3>
                <p>X402 protocol enables instant stablecoin payments for every API call, token, or agent interaction.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>⚡</div>
                <h3>Gasless Transactions</h3>
                <p>ERC-4337 powered smart accounts eliminate gas fees for seamless agent operations.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🔒</div>
                <h3>Policy Governance</h3>
                <p>Set spending limits and control project financial behavior with programmable policies.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🔄</div>
                <h3>Revenue Aggregation</h3>
                <p>All agent earnings flow into your unified project wallet for simplified management.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📊</div>
                <h3>Real-time Analytics</h3>
                <p>Complete visibility into project performance, agent activity, and revenue generation.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Coinbase Integration Section */}
        <section className={styles.integration}>
          <div className={styles.container}>
            <div className={styles.integrationContent}>
              <div className={styles.integrationHeader}>
                <div className={styles.integrationBadge}>
                  <span className={styles.badgeIcon}>🏗️</span>
                  Powered by Coinbase CDP & X402
                </div>
                <h2 className={styles.integrationTitle}>
                  How does Coinbase CDP Wallet & X402 integrated with AgentMeter?
                </h2>
                <p className={styles.integrationDescription}>
                  AgentMeter creates the first agent-native financial infrastructure by combining Coinbase's enterprise CDP platform with X402 micropayment protocol, enabling autonomous financial operations for AI agents.
                </p>
              </div>

              <div className={styles.integrationGrid}>
                <div className={styles.integrationCard}>
                  <div className={styles.cardIcon}>
                    <span className={styles.iconEmoji}>🏦</span>
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>Project-Level CDP Wallets</h3>
                    <p className={styles.cardDescription}>
                      Each project gets its own CDP smart account with ERC-4337 account abstraction. All agent revenue flows into the project wallet automatically. Gasless transactions, programmable spending policies, and direct integration with Base Sepolia network.
                    </p>
                    <div className={styles.cardBenefits}>
                      <div className={styles.benefit}>✓ Unified project wallets</div>
                      <div className={styles.benefit}>✓ Gasless transactions (ERC-4337)</div>
                      <div className={styles.benefit}>✓ Automatic revenue collection</div>
                      <div className={styles.benefit}>✓ Enterprise-grade security</div>
                    </div>
                  </div>
                </div>

                <div className={styles.integrationCard}>
                  <div className={styles.cardIcon}>
                    <span className={styles.iconEmoji}>⚡</span>
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>X402 Micropayment Protocol</h3>
                    <p className={styles.cardDescription}>
                      Hybrid approach combining X402 HTTP 402 "Payment Required" standard with CDP project wallets. Automatic micropayments for API calls ($0.001), input tokens ($0.002/1K), output tokens ($0.004/1K), and meter events ($0.005). All payments flow to your project wallet seamlessly.
                    </p>
                    <div className={styles.cardBenefits}>
                      <div className={styles.benefit}>✓ Usage-based billing automation</div>
                      <div className={styles.benefit}>✓ Sub-cent micropayment precision</div>
                      <div className={styles.benefit}>✓ Batch payment processing</div>
                      <div className={styles.benefit}>✓ Centralized revenue collection</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.outcomeSection}>
                <h3 className={styles.outcomeTitle}>Project-Native Financial Infrastructure Achieved</h3>
                <div className={styles.outcomeGrid}>
                  <div className={styles.outcomeCard}>
                    <div className={styles.outcomeIcon}>🏦</div>
                    <h4>Unified Revenue Collection</h4>
                    <p>All agent earnings flow automatically into your project's CDP wallet, providing centralized financial management with enterprise-grade security.</p>
                  </div>
                  <div className={styles.outcomeCard}>
                    <div className={styles.outcomeIcon}>💸</div>
                    <h4>Zero-Friction Micropayments</h4>
                    <p>Payments happen automatically in the background as agents interact - no payment flows, no user intervention, just seamless value exchange.</p>
                  </div>
                  <div className={styles.outcomeCard}>
                    <div className={styles.outcomeIcon}>🌐</div>
                    <h4>Global Agent Marketplace</h4>
                    <p>Enables a global marketplace where agents can discover, pay for, and monetize services instantly across any border or jurisdiction.</p>
                  </div>
                  <div className={styles.outcomeCard}>
                    <div className={styles.outcomeIcon}>📈</div>
                    <h4>Scalable Business Model</h4>
                    <p>From micro-transactions to enterprise deals, the infrastructure scales automatically with transparent, usage-based pricing and unified analytics.</p>
                  </div>
                </div>
              </div>

              <div className={styles.integrationCta}>
                <div className={styles.ctaContent}>
                  <h3>Ready to deploy project-native financial infrastructure?</h3>
                  <p>Join the revolution that's enabling seamless revenue collection for AI agent projects.</p>
                  <div className={styles.ctaButtons}>
                    <Link to="/register" className={styles.primaryButton}>
                      Create Project Wallet
                    </Link>
                    <Link to="/docs" className={styles.secondaryButton}>
                      CDP Integration Guide
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Example Section - Moved right after integration */}
        <section className={styles.codeSection}>
          <div className={styles.container}>
            <div className={styles.codeGrid}>
              <div className={styles.codeLeft}>
                <h2>Start project financial infrastructure in 3 lines of code</h2>
                <p>Our CDP-enhanced SDKs provide everything needed for project-native financial operations.</p>
                <div className={styles.codeFeatures}>
                  <div className={styles.codeFeature}>
                    <span className={styles.checkIcon}>✓</span>
                    Automatic project wallet creation
                  </div>
                  <div className={styles.codeFeature}>
                    <span className={styles.checkIcon}>✓</span>
                    X402 micropayment integration
                  </div>
                  <div className={styles.codeFeature}>
                    <span className={styles.checkIcon}>✓</span>
                    Gasless transactions
                  </div>
                  <div className={styles.codeFeature}>
                    <span className={styles.checkIcon}>✓</span>
                    Unified revenue collection
                  </div>
                </div>
                <Link to="/docs" className={styles.primaryButton}>
                  View CDP Integration Docs
                </Link>
              </div>
              <div className={styles.codeRight}>
                <div className={styles.codeBlock}>
                  <div className={styles.codeHeader}>
                    <div className={styles.codeTabs}>
                      <span className={styles.activeTab}>Python</span>
                      <span>Node.js</span>
                    </div>
                  </div>
                  <pre className={styles.codeContent}>{`import { AgentMeter, CDPWallet } from '@agentmeter/sdk'

# Initialize with CDP integration
meter = AgentMeter(
    api_key='your_key',
    project_id='my-ai-project',
    cdp_enabled=True
)

# Project wallet created automatically
project_wallet = meter.get_project_wallet()
print(f"Project wallet: {project_wallet.address}")

# Track agent usage with automatic payments
meter.record_event(
    agent_id='content-gen-v2',
    event_type='api_request',
    tokens_in=1500,
    tokens_out=800,
    auto_pay=True  # X402 + CDP magic
)

# All revenue flows to project wallet automatically`}</pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className={styles.useCases}>
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2>Built for every use case</h2>
              <p>From API monetization to AI agent billing, we've got you covered.</p>
            </div>
            <div className={styles.useCaseGrid}>
              <Link to="/case-studies" className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🌐</div>
                <h3>API Monetization</h3>
                <p>Transform your API into a revenue stream with usage-based pricing.</p>
                <span className={styles.useCaseLink}>Learn more →</span>
              </Link>
              <Link to="/case-studies" className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🤖</div>
                <h3>AI Agent Billing</h3>
                <p>Meter token usage separately for input and output with custom pricing.</p>
                <span className={styles.useCaseLink}>Learn more →</span>
              </Link>
              <Link to="/case-studies" className={styles.useCaseCard}>
                <div className={styles.useCaseIcon}>🎮</div>
                <h3>Gaming & E-commerce</h3>
                <p>Enable instant micropayments for in-game purchases and premium features.</p>
                <span className={styles.useCaseLink}>Learn more →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.cta}>
          <div className={styles.container}>
            <div className={styles.ctaContent}>
              <h2>Ready to build the future of usage-based billing?</h2>
              <p>Join thousands of developers already using AgentMeter to create fair, transparent pricing.</p>
              <div className={styles.ctaButtons}>
                <Link to="/register" className={styles.primaryButton}>
                  Start Building Free
                </Link>
                <Link to="/docs" className={styles.secondaryButton}>
                  View Documentation
                </Link>
              </div>
              <div className={styles.ctaStats}>
                <div className={styles.ctaStat}>
                  <span className={styles.ctaStatValue}>99.99%</span>
                  <span className={styles.ctaStatLabel}>Uptime SLA</span>
                </div>
                <div className={styles.ctaStat}>
                  <span className={styles.ctaStatValue}>10M+</span>
                  <span className={styles.ctaStatLabel}>Events/month</span>
                </div>
                                 <div className={styles.ctaStat}>
                   <span className={styles.ctaStatValue}>&lt; 50ms</span>
                   <span className={styles.ctaStatLabel}>P99 Latency</span>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Fragment>
  )
}

export default Landing
