import 'core-js/stable'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReduxRouter } from '@lagunovsky/redux-react-router'
import { createBrowserHistory } from 'history'
import * as bundles from 'routes/async'
import Provider from 'components/Provider'
import { errorLoading } from 'utils'
import configure from 'store'
import Routes from 'routes'
import sagas from 'sagas'

const isPreloaded = !!window.__PRELOADED_STATE__
const preloadedState = window.__PRELOADED_STATE__ || {}
const preloadedChunks = window.__PRELOADED_CHUNKS__ || []
const browserHistory = createBrowserHistory()
const store = configure(preloadedState, browserHistory)
store.runSaga(sagas)

const renderApp = (Routes) => {
  if (isPreloaded) {
    ReactDOM.hydrateRoot(
      document.getElementById('root'),
      <Provider store={store}>
        <ReduxRouter history={browserHistory}>
          <Routes />
        </ReduxRouter>
      </Provider>
    )
  } else {
    const root = ReactDOM.createRoot(document.getElementById('root'))

    root.render(
      <Provider store={store}>
        <ReduxRouter history={browserHistory}>
          <Routes />
        </ReduxRouter>
      </Provider>
    )
  }
}

async function runApp() {
  try {
    if (!window.Intl) {
      await import('intl'/* webpackChunkName: 'intl' */)
      await Promise.all([
        import('intl/locale-data/jsonp/en.js'/* webpackChunkName: 'en' */),
        import('intl/locale-data/jsonp/zh.js'/* webpackChunkName: 'zh' */)
      ])
      console.log('using intl polyfill')
    }

    if (preloadedChunks) {
      await Promise.all(preloadedChunks.map(
        chunk => bundles[chunk].loadComponent()
      ))
    }

    renderApp(Routes)
  } catch (error) {
    errorLoading(error)
  }
}

if (module.hot) {
  module.hot.accept('routes', () => {
    const nextRoutes = require('routes').default
    renderApp(nextRoutes)
  })
}

runApp()
