import { all, fork } from 'redux-saga/effects'
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { ENV } from 'constants/env'
=======
import projectSaga from './project'
>>>>>>> Stashed changes
=======
import projectSaga from './project'
>>>>>>> Stashed changes
import intlSaga from './intl'
import themeSaga from './theme'

export default function* rootSaga() {
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  yield all(sagas)
=======
=======
>>>>>>> Stashed changes
  yield all([
    fork(projectSaga),
    fork(intlSaga),
    fork(themeSaga)
  ])
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
}