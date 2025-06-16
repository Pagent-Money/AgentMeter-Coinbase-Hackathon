import { takeEvery } from 'redux-saga/effects'
import * as actions from 'actions/intl'

function setLocale(action) {

}

export default function* intlSaga() {
  yield takeEvery(String(actions.setLocale), setLocale)
}
