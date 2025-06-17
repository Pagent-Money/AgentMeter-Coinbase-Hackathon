/* global __webpack_hash__ */

import cluster from 'cluster'
import os from 'os'
import path from 'path'
import Express from 'express'
import compression from 'compression'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { createMemoryHistory } from 'history'
import { matchRoutes, matchPath, renderMatches } from 'react-router-dom'
import { createStaticRouter, StaticRouter } from 'react-router-dom/server'
import serialize from 'serialize-javascript'
import { getInitialLang } from 'selectors/intl'
import { flushTitle } from 'components/DocumentTitle'
import Provider from 'components/Provider'
import configure from 'store'
import Routes, { routes } from 'routes'
import sagas from 'sagas'
import { paymentMiddleware } from 'x402-express'

const numCPUs = os.cpus().length

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`)

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker) => {
    console.log(`worker ${worker.process.pid} died`)
  })
} else {
  const renderFullPage = (root, title, state, chunks) => `
  <!DOCTYPE html>
  <!--[if lt IE 7 ]> <html class="ie6"> <![endif]-->
  <!--[if IE 7 ]>    <html class="ie7"> <![endif]-->
  <!--[if IE 8 ]>    <html class="ie8"> <![endif]-->
  <!--[if IE 9 ]>    <html class="ie9"> <![endif]-->
  <!--[if (gt IE 9) ]>    <html class="ie"> <![endif]-->
  <!--[if !(IE)]><!--> <html> <!--<![endif]-->
  <head>
    <meta charset="utf-8">
    <meta name="description" content="Agent Meter is a platform for creating and trading digital asset" data-react-helmet="true">
    <meta name="keywords" content="agent,nft,programming system,visual programming,smart contract,blockchain,cryptocurrencies,bitcoin,ethereum" data-react-helmet="true">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0">
    <link rel="stylesheet" href="/styles/bundle.css?v=${__webpack_hash__}">
    ${chunks.map(chunk => `<link rel="stylesheet" href="/styles/${chunk}.chunk.css?v=${__webpack_hash__}">`)}
  </head>
  <body>
    <div id="root">${root}</div>
    <script>window.__PRELOADED_STATE__ = ${serialize(state, { isJSON: true })}</script>
    <script>window.__PRELOADED_CHUNKS__ = ${JSON.stringify(chunks)}</script>
    <script src="/scripts/bundle.js?v=${__webpack_hash__}"></script>
  </body>
  </html>
    `

  const port = 9090
  const app = new Express()

  app.use(compression())
  app.use('/fonts', Express.static(path.join(__dirname, '/fonts')))
  app.use('/images', Express.static(path.join(__dirname, '/images')))
  app.use('/styles', Express.static(path.join(__dirname, '/styles')))
  app.use('/scripts', Express.static(path.join(__dirname, '/scripts')))

  app.get('/robots.txt', (req, res) => {
    res.type('text/plain')
    res.send('User-agent: *\nDisallow: /')
  })

  app.get('*', async (req, res) => {
    try {
      const location = req.url
      const history = createMemoryHistory({ initialEntries: [req.url] })
      const store = configure({ intl: getInitialLang() }, history)
      const rootTask = store.runSaga(sagas)
      store.close()
      await rootTask.done

      const context = { preloadedChunks: [] }
      const matches = matchRoutes(routes, location)

      if (!matches.length) {
        res.redirect(301, '/')
      } else {
        const MatchedPage = matches.slice(-1)[0].route.component
        context.preloadedChunks.push(MatchedPage.chunkName || 'Landing')

        const html = ReactDOMServer.renderToString(
          <Provider store={store}>
            <StaticRouter history={history} location={location}>
              <Routes />
            </StaticRouter>
          </Provider>
        )

        const title = flushTitle()
        const preloadedState = store.getState()
        const preloadedChunks = context.preloadedChunks
        res.status(200).send(renderFullPage(html, title, preloadedState, preloadedChunks))
      }
    } catch (error) {
      res.status(500).send(`Internal Server Error: ${error.message}`)
    }
  })

  app.listen(port, () => console.log(`Listening on port ${port}`))
  console.log(`Worker ${process.pid} started`)
}
