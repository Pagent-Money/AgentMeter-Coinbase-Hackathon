import React, { useEffect, useState, useCallback, Fragment } from 'react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import styles from './style.css'

const Landing = () => {
  return (
    <Fragment>
      <div className={styles.landing}>
        <div className={classNames(styles.section, styles.intro)}>
          <div className={styles.content}>

          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Landing
