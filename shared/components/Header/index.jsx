import React, { useCallback, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Link } from 'react-router-dom'
import { withRouter } from 'utils/withRouter'
import classNames from 'classnames'
import styles from './style.css'

const Header = ({ location, actions }) => {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            AgentMeter
          </div>
          <nav className={styles.nav}>
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link href="#sdk">SDK</Link>
            <Link href="#portal">Business Portal</Link>
            <Link href="#docs">Documentation</Link>
          </nav>
          <Link href="#portal" className={styles.ctaButton}>
            Get Started
          </Link>
        </div>
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
