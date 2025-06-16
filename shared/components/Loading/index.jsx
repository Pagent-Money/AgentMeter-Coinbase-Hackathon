import React, { Component } from 'react'
import styles from './style.css'

const Spinner = () => (
  <div className={styles.spinner} />
)

export default class Loading extends Component {
  render () {
    return null

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `rgba(45, 41, 45, 1)`
        }}
      >
        <div className={styles.spaceLoader}>
          <div className={styles.loading}>
            <Spinner />
            <span className={styles.loadingText}>Loading...</span>
          </div>
        </div>
      </div>
    )
  }
}
