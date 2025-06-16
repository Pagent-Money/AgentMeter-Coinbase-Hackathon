import { createStore, applyMiddleware, compose, Store } from 'redux'
import createSagaMiddleware, { END } from 'redux-saga'
import { createRouterMiddleware } from '@lagunovsky/redux-react-router'
import createRootReducer from 'reducers'

export default function configure(initialState, history) {
  const sagaMiddleware = createSagaMiddleware()
  const routerMiddleware = createRouterMiddleware(history)
  const middlewares = [routerMiddleware, sagaMiddleware]
  const composeEnhancers = (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose
  const rootReducer = createRootReducer(history)
  const store = createStore(rootReducer, initialState, composeEnhancers(applyMiddleware(...middlewares)))

  store.runSaga = sagaMiddleware.run
  store.close = () => store.dispatch(END)

  if (module.hot) {
    module.hot.accept('reducers', () => {
      const nextReducer = require('reducers').default
      store.replaceReducer(nextReducer)
    })
  }

  return store
}
