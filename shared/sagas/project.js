import { takeEvery, call, put } from 'redux-saga/effects'
import * as api from 'api/project'
import * as actions from 'actions/project'

// Project sagas
function* createProject(action) {
  try {
    const { name, description, settings } = action.payload
    const response = yield call(api.createProject, { name, description, settings })

    if (response.success) {
      yield put(actions.createProjectSuccess(response.project))
    } else {
      yield put(actions.createProjectFailure(response.error || 'Failed to create project'))
    }
  } catch (error) {
    console.error('Error creating project:', error)
    yield put(actions.createProjectFailure(error.message || 'Failed to create project'))
  }
}

function* loadProject(action) {
  try {
    const { id } = action.payload
    const response = yield call(api.loadProject, { id })

    if (response.success) {
      yield put(actions.loadProjectSuccess(response.project))
    } else {
      yield put(actions.loadProjectFailure(response.error || 'Failed to load project'))
    }
  } catch (error) {
    console.error('Error loading project:', error)
    yield put(actions.loadProjectFailure(error.message || 'Failed to load project'))
  }
}

function* loadProjects(action) {
  try {
    const response = yield call(api.loadProjects)
    console.log('loadProjects response', response)

    if (response.success) {
      yield put(actions.loadProjectsSuccess(response.projects))
    } else {
      yield put(actions.loadProjectsFailure(response.error || 'Failed to load projects'))
    }
  } catch (error) {
    console.error('Error loading projects:', error)
    yield put(actions.loadProjectsFailure(error.message || 'Failed to load projects'))
  }
}

function* updateProject(action) {
  try {
    const { id, ...updateData } = action.payload
    const response = yield call(api.updateProject, { id, ...updateData })

    if (response.success) {
      yield put(actions.updateProjectSuccess({ id, ...updateData }))
    } else {
      yield put(actions.updateProjectFailure(response.error || 'Failed to update project'))
    }
  } catch (error) {
    console.error('Error updating project:', error)
    yield put(actions.updateProjectFailure(error.message || 'Failed to update project'))
  }
}

function* deleteProject(action) {
  try {
    const { id } = action.payload
    const response = yield call(api.deleteProject, { id })

    if (response.success) {
      yield put(actions.deleteProjectSuccess({ id }))
    } else {
      yield put(actions.deleteProjectFailure(response.error || 'Failed to delete project'))
    }
  } catch (error) {
    console.error('Error deleting project:', error)
    yield put(actions.deleteProjectFailure(error.message || 'Failed to delete project'))
  }
}

// Meter events sagas
function* recordMeterEvent(action) {
  try {
    const eventData = action.payload
    const response = yield call(api.recordMeterEvent, eventData)

    if (response.success) {
      yield put(actions.recordMeterEventSuccess(response.event))
    } else {
      yield put(actions.recordMeterEventFailure(response.error || 'Failed to record meter event'))
    }
  } catch (error) {
    console.error('Error recording meter event:', error)
    yield put(actions.recordMeterEventFailure(error.message || 'Failed to record meter event'))
  }
}

function* loadMeterEvents(action) {
  try {
    const { project_id, agent_id, limit, offset } = action.payload
    const response = yield call(api.loadMeterEvents, { project_id, agent_id, limit, offset })

    if (response.success) {
      yield put(actions.loadMeterEventsSuccess(response.events))
    } else {
      yield put(actions.loadMeterEventsFailure(response.error || 'Failed to load meter events'))
    }
  } catch (error) {
    console.error('Error loading meter events:', error)
    yield put(actions.loadMeterEventsFailure(error.message || 'Failed to load meter events'))
  }
}

function* loadBillingRecords(action) {
  try {
    const response = yield call(api.loadBillingRecords, action.payload)
    if (response.success) {
      yield put(actions.loadBillingRecordsSuccess(response.records))
    } else {
      yield put(actions.loadBillingRecordsFailure(response.error || 'Failed to load billing records'))
    }
  } catch (error) {
    console.error('Error loading billing records:', error)
    yield put(actions.loadBillingRecordsFailure(error.message || 'Failed to load billing records'))
  }
}

export default function* projectSaga() {
  // Project watchers
  yield takeEvery(String(actions.createProject), createProject)
  yield takeEvery(String(actions.loadProject), loadProject)
  yield takeEvery(String(actions.loadProjects), loadProjects)
  yield takeEvery(String(actions.updateProject), updateProject)
  yield takeEvery(String(actions.deleteProject), deleteProject)

  // Meter events watchers
  yield takeEvery(String(actions.recordMeterEvent), recordMeterEvent)
  yield takeEvery(String(actions.loadMeterEvents), loadMeterEvents)

  // Billing records watchers
  yield takeEvery(String(actions.loadBillingRecords), loadBillingRecords)
}
