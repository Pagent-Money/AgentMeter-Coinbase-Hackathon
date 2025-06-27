import { meterApi } from 'api'

// Helper function to get user authentication headers
const getAuthHeaders = () => {
  const sessionToken = localStorage.getItem('sessionToken')
  
  if (sessionToken) {
    return {
      'Authorization': `Bearer ${sessionToken}`
    }
  }
  return {}
}

// Project management APIs
export const createProject = ({ name, description, settings }, options) => {
  const authHeaders = getAuthHeaders()
  const customOptions = {
    ...options,
    headers: {
      ...authHeaders,
      ...(options?.headers || {})
    }
  }
  return meterApi('POST', '/projects', { name, description, settings }, customOptions)
}

export const loadProject = ({ id }, options) =>
  meterApi('GET', '/project/load', { id }, options)

export const loadProjects = (options) => {
  const authHeaders = getAuthHeaders()
  const customOptions = {
    ...options,
    headers: {
      ...authHeaders,
      ...(options?.headers || {})
    }
  }
  return meterApi('GET', '/projects', {}, customOptions)
}

export const updateProject = ({ id, name, description, status, settings }, options) =>
  meterApi('PUT', `/project/${id}`, { name, description, status, settings }, options)

export const deleteProject = ({ id }, options) =>
  meterApi('DELETE', `/project/${id}`, {}, options)

// Meter events APIs
export const recordMeterEvent = ({ project_id, agent_id, user_id, tokens_in, tokens_out, api_calls }, options) =>
  meterApi('POST', '/meter/event', { project_id, agent_id, user_id, tokens_in, tokens_out, api_calls }, options)

export const loadMeterEvents = ({ project_id }, options) =>
  meterApi('GET', '/meter/events', { project_id }, options)

export const loadBillingRecords = ({ project_id }, options) =>
  meterApi('GET', '/billing/records', { project_id }, options)
