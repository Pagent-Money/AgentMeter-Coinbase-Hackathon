import React, { Fragment, useEffect, useState } from 'react'
import classNames from 'classnames'
import { createPortal } from 'react-dom'
import { Outlet } from 'react-router'
import Header from 'components/Header'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { withRouter } from 'utils/withRouter'
import Title from 'components/DocumentTitle'
import 'resources/fonts/style.css'
import { Buffer } from 'safe-buffer'
import styles from './style.css'

const Root = ({ location, history, actions }) => {
  const [title, setTitle] = useState('Agent Meter')

  useEffect(() => {
    setTitle('Agent Meter')
  }, [])

  return (
    <Fragment>
      <Title render={title} />
      <div className={classNames(styles.root)}>
        hello, {title}
        <Outlet />
      </div>
    </Fragment>
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
  )(Root)
)
