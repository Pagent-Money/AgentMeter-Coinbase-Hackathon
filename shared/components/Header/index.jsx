import React, { useCallback, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Link } from 'react-router-dom'
import { withRouter } from 'utils/withRouter'
import classNames from 'classnames'

const Header = ({ location, actions }) => {
  return (
    <div className={classNames(styles.header)}>
      <div className={styles.main}>
        <Link className={styles.branding} to="/">
          <div className={styles.text}>

          </div>
        </Link>
      </div>
    </div>
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
