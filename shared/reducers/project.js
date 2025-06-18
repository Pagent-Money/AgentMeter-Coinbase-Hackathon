import { handleActions } from 'utils/redux-actions'
import * as actions from 'actions/project'

const initialState = {
  projects: [],
  currentProject: null,
  meterEvents: [],
  loading: false,
  error: null
}

export default handleActions({
  // Project actions
  [actions.createProject] (state, action) {
    return {
      ...state,
      loading: true,
      error: null
    }
  },
  
  [actions.createProjectSuccess] (state, action) {
    return {
      ...state,
      loading: false,
      projects: [...state.projects, action.payload],
      error: null
    }
  },
  
  [actions.createProjectFailure] (state, action) {
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  },

  [actions.loadProject] (state, action) {
    return {
      ...state,
      loading: true,
      error: null
    }
  },
  
  [actions.loadProjectSuccess] (state, action) {
    return {
      ...state,
      loading: false,
      currentProject: action.payload,
      error: null
    }
  },
  
  [actions.loadProjectFailure] (state, action) {
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  },

  [actions.loadProjects] (state, action) {
    return {
      ...state,
      loading: true,
      error: null
    }
  },
  
  [actions.loadProjectsSuccess] (state, action) {
    return {
      ...state,
      loading: false,
      projects: action.payload,
      error: null
    }
  },
  
  [actions.loadProjectsFailure] (state, action) {
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  },

  [actions.updateProject] (state, action) {
    return {
      ...state,
      loading: true,
      error: null
    }
  },
  
  [actions.updateProjectSuccess] (state, action) {
    const { id, ...updateData } = action.payload
    return {
      ...state,
      loading: false,
      projects: state.projects.map(project => 
        project.id === id ? { ...project, ...updateData } : project
      ),
      currentProject: state.currentProject?.id === id 
        ? { ...state.currentProject, ...updateData }
        : state.currentProject,
      error: null
    }
  },
  
  [actions.updateProjectFailure] (state, action) {
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  },

  [actions.deleteProject] (state, action) {
    return {
      ...state,
      loading: true,
      error: null
    }
  },
  
  [actions.deleteProjectSuccess] (state, action) {
    const { id } = action.payload
    return {
      ...state,
      loading: false,
      projects: state.projects.filter(project => project.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
      error: null
    }
  },
  
  [actions.deleteProjectFailure] (state, action) {
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  },

  // Meter events actions
  [actions.recordMeterEvent] (state, action) {
    return {
      ...state,
      loading: true,
      error: null
    }
  },
  
  [actions.recordMeterEventSuccess] (state, action) {
    return {
      ...state,
      loading: false,
      meterEvents: [action.payload, ...state.meterEvents],
      error: null
    }
  },
  
  [actions.recordMeterEventFailure] (state, action) {
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  },

  [actions.loadMeterEvents] (state, action) {
    return {
      ...state,
      loading: true,
      error: null
    }
  },
  
  [actions.loadMeterEventsSuccess] (state, action) {
    return {
      ...state,
      loading: false,
      meterEvents: action.payload,
      error: null
    }
  },
  
  [actions.loadMeterEventsFailure] (state, action) {
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  }
}, initialState)
