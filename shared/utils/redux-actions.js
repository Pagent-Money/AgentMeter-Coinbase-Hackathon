import { produce } from 'immer'
import { handleActions as reduxHandleActions } from 'redux-actions'

export const handleActions = (actions, state) => reduxHandleActions(
  Object.keys(actions).reduce((handlers, key) => {
    handlers[key] = produce(actions[key])
    return handlers
  }, {}),
  state
)
