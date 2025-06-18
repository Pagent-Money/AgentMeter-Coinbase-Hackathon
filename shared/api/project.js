import { meterApi } from 'api'

export const createProject = ({ id, title, crdt }, options) => meterApi('POST', '/project/create', { id, title, crdt })
export const loadProject = ({ id }, options) => meterApi('GET', '/project/load', { id }, options)
