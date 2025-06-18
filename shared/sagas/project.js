import { takeEvery, call } from 'redux-saga/effects'
import * as api from 'api/project'
import * as actions from 'actions/project'

function* createProject(action) {
  try {
    const { name } = action.payload
    yield call(api.createProject, { name })
    console.log('createProject action', action, api)
  } catch (error) {
    console.log('error', error.message)
  }
}

export default function* projectSaga() {
  yield takeEvery(String(actions.createProject), createProject)
}
