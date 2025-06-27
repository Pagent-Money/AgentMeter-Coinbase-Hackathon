import React, { useCallback, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Link, useNavigate } from 'react-router-dom'
import { withRouter } from 'utils/withRouter'
import classNames from 'classnames'
import styles from './style.css'

const Header = ({ location, actions }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userEmail')
    navigate('/login')
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <span className={styles.logoText}>AgentMeter</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink}>Home</Link>
            <Link to="/dashboard" className={styles.navLink}>Dashboard</Link>
            <Link to="/docs" className={styles.navLink}>Docs</Link>
            <Link to="/case-studies" className={styles.navLink}>Case Studies</Link>
            <Link to="/coinbase-hackathon" className={styles.navLink}>🏆 Live Demos</Link>
          </nav>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <Link to="/login" className={styles.loginButton}>
              Login
            </Link>
            <Link to="/register" className={styles.ctaButton}>
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className={styles.mobileMenuButton}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburger}></span>
          </button>

          {isAuthenticated && (
            <button className={styles.logoutButton} onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className={styles.mobileNav}>
            <Link to="/" className={styles.mobileNavLink} onClick={toggleMenu}>Home</Link>
            <Link to="/dashboard" className={styles.mobileNavLink} onClick={toggleMenu}>Dashboard</Link>
            <Link to="/docs" className={styles.mobileNavLink} onClick={toggleMenu}>Docs</Link>
            <Link to="/case-studies" className={styles.mobileNavLink} onClick={toggleMenu}>Case Studies</Link>
            <Link to="/coinbase-hackathon" className={styles.mobileNavLink} onClick={toggleMenu}>🏆 Live Demos</Link>
            <Link to="/login" className={styles.mobileNavLink} onClick={toggleMenu}>Login</Link>
            <Link to="/register" className={styles.mobileCtaButton} onClick={toggleMenu}>Get Started</Link>
          </div>
        )}
      </div>
    </header>
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
  )(Header)
)
