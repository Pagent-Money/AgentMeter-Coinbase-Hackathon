import React from 'react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import styles from './style.css'

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          {/* Logo and Description */}
          <div className={styles.logoSection}>
            <Link to="/" className={styles.logo}>
              <span className={styles.logoIcon}>⚡</span>
              <span className={styles.logoText}>AgentMeter</span>
            </Link>
            <p className={styles.description}>
              The fastest way to ship usage-based billing for AI agents with x402 enabled stablecoin micropayments.
            </p>
            <div className={styles.social}>
              <a href="https://github.com/Pagent-Money" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                GitHub
              </a>
              <a href="https://twitter.com/agentmeter" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                Twitter
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className={styles.linkSections}>
            <div className={styles.linkSection}>
              <h3 className={styles.linkSectionTitle}>Developers</h3>
              <Link to="/docs" className={styles.link}>Documentation</Link>
              <a href="https://github.com/Pagent-Money/agentmeter-sdk-python" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub</a>
            </div>

            <div className={styles.linkSection}>
              <h3 className={styles.linkSectionTitle}>Use Cases</h3>
              <Link to="/case-studies" className={styles.link}>Case Studies</Link>
            </div>

            <div className={styles.linkSection}>
              <h3 className={styles.linkSectionTitle}>Platform</h3>
              <Link to="/dashboard" className={styles.link}>Dashboard</Link>
              <Link to="/login" className={styles.link}>Login</Link>
              <Link to="/register" className={styles.link}>Get Started</Link>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className={styles.bottom}>
          <div className={styles.bottomContent}>
            <p className={styles.copyright}>
              © 2025 AgentMeter. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
