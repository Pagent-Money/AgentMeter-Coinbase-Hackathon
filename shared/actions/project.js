import { createAction } from 'redux-actions'

// Project actions
export const createProject = createAction('project/CREATE')
export const createProjectSuccess = createAction('project/CREATE_SUCCESS')
export const createProjectFailure = createAction('project/CREATE_FAILURE')

export const loadProject = createAction('project/LOAD')
export const loadProjectSuccess = createAction('project/LOAD_SUCCESS')
export const loadProjectFailure = createAction('project/LOAD_FAILURE')

export const loadProjects = createAction('project/LOAD_ALL')
export const loadProjectsSuccess = createAction('project/LOAD_ALL_SUCCESS')
export const loadProjectsFailure = createAction('project/LOAD_ALL_FAILURE')

export const updateProject = createAction('project/UPDATE')
export const updateProjectSuccess = createAction('project/UPDATE_SUCCESS')
export const updateProjectFailure = createAction('project/UPDATE_FAILURE')

export const deleteProject = createAction('project/DELETE')
export const deleteProjectSuccess = createAction('project/DELETE_SUCCESS')
export const deleteProjectFailure = createAction('project/DELETE_FAILURE')

// Meter events actions
export const recordMeterEvent = createAction('meter/RECORD_EVENT')
export const recordMeterEventSuccess = createAction('meter/RECORD_EVENT_SUCCESS')
export const recordMeterEventFailure = createAction('meter/RECORD_EVENT_FAILURE')

export const loadMeterEvents = createAction('meter/LOAD_EVENTS')
export const loadMeterEventsSuccess = createAction('meter/LOAD_EVENTS_SUCCESS')
export const loadMeterEventsFailure = createAction('meter/LOAD_EVENTS_FAILURE')
