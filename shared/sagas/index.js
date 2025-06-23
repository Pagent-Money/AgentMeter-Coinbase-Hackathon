import { all, fork } from 'redux-saga/effects'
<<<<<<< Updated upstream
import { ENV } from 'constants/env'
=======
import projectSaga from './project'
>>>>>>> Stashed changes
import intlSaga from './intl'
import themeSaga from './theme'

export default function* rootSaga() {
<<<<<<< Updated upstream
  yield all(sagas)
=======
  yield all([
    fork(projectSaga),
    fork(intlSaga),
    fork(themeSaga)
  ])
>>>>>>> Stashed changes
}