import { handleActions } from 'utils/redux-actions'
import * as actions from 'actions/theme'

const initialState = {
  theme: 'dark'
}

export default handleActions({
  [actions.setTheme] (state, action) {
    state.theme = action.payload.theme
  }
}, initialState)
