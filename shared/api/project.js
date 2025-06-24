import { meterApi } from 'api'

// Project management APIs
export const createProject = ({ name, description, settings }, options) =>
  meterApi('POST', '/project/create', { name, description, settings }, options)

export const loadProject = ({ id }, options) =>
  meterApi('GET', '/project/load', { id }, options)

export const loadProjects = (options) =>
  meterApi('GET', '/projects', {}, options)

export const updateProject = ({ id, name, description, status, settings }, options) =>
  meterApi('PUT', `/project/${id}`, { name, description, status, settings }, options)

export const deleteProject = ({ id }, options) =>
  meterApi('DELETE', `/project/${id}`, {}, options)

// Meter events APIs
export const recordMeterEvent = ({ project_id, agent_id, user_id, tokens_in, tokens_out, api_calls }, options) =>
  meterApi('POST', '/meter/event', { project_id, agent_id, user_id, tokens_in, tokens_out, api_calls }, options)

export const loadMeterEvents = ({ project_id }, options) =>
  meterApi('GET', '/meter/events', { project_id }, options)
