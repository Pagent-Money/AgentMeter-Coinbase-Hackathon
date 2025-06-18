import React, { useCallback, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Link } from 'react-router-dom'
import { withRouter } from 'utils/withRouter'
import classNames from 'classnames'
import styles from './style.css'

const Footer = ({ location, actions }) => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>&copy; 2024 AgentMeter. All rights reserved.</p>
        <p>
          Powered by x402 stablecoin micropayments |
          <a href="#"> Privacy Policy</a> |
    <a href="#"> Terms of Service</a> |
    <a href="#"> Contact</a>
        </p>
      </div>
    </footer>
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
  )(Footer)
)
