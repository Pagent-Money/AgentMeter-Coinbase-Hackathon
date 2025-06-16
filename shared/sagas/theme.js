import { takeEvery } from 'redux-saga/effects'
import * as actions from 'actions/theme'

function setTheme(action) {
  const { channel, theme } = action.payload
  channel.changeTheme(theme)
}

export default function* themeSaga() {
  yield takeEvery(String(actions.setTheme), setTheme)
}
