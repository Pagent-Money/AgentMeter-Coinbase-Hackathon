import { all, fork } from 'redux-saga/effects'
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { ENV } from 'constants/env'
=======
import projectSaga from './project'
>>>>>>> Stashed changes
=======
import projectSaga from './project'
>>>>>>> Stashed changes
=======
import projectSaga from './project'
>>>>>>> Stashed changes
import intlSaga from './intl'
import themeSaga from './theme'

export default function* rootSaga() {
  yield all([
    fork(projectSaga),
    fork(intlSaga),
    fork(themeSaga)
  ])
}