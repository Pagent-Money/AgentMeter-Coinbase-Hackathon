import { all, fork } from 'redux-saga/effects'
import { ENV } from 'constants/_env'
import intlSaga from './intl'
import themeSaga from './theme'
import projectSaga from './project'
import loggerSaga from './logger'

const sagas = {
  intlSaga: fork(intlSaga),
  themeSaga: fork(themeSaga),
  projectSaga: fork(projectSaga),
  loggerSaga: fork(loggerSaga)
}

if (ENV === 'production') {
  delete sagas.loggerSaga
}

export default function* rootSaga() {
  yield all(sagas)
}
