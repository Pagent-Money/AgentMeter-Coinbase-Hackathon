import React, { useEffect, useState, useCallback, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { withRouter } from 'utils/withRouter'
import * as projectActions from 'actions/project'
import classNames from 'classnames'
import styles from './style.css'

const Dashboard = ({ actions, projects, currentProject, meterEvents, loading, error }) => {
  const [activeTab, setActiveTab] = useState('projects')
  const [selectedProject, setSelectedProject] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [copiedSecretKey, setCopiedSecretKey] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [copiedProjectId, setCopiedProjectId] = useState(false)

  // Load projects on component mount
  useEffect(() => {
    actions.loadProjects()
  }, [actions])

  // Set first project as selected when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id)
    }
  }, [projects, selectedProject])

  // Load meter events for selected project (only when switching project)
  useEffect(() => {
    if (selectedProject) {
      const params = {
        project_id: selectedProject,
        limit: 100
      }
      actions.loadMeterEvents(params)
    }
  }, [selectedProject, actions])

  // Calculate filtered events based on time filter
  const getFilteredEvents = useCallback(() => {
    if (!meterEvents.length) return []
    
    const now = new Date()
    const timeFilters = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    if (timeFilter === 'all') return meterEvents
    
    const filterTime = timeFilters[timeFilter]
    return meterEvents.filter(event => new Date(event.timestamp) >= filterTime)
  }, [meterEvents, timeFilter])

  // Calculate revenue statistics
  const getRevenueStats = useCallback(() => {
    const filteredEvents = getFilteredEvents()
    
    const totalRequestCost = filteredEvents.reduce((sum, event) => sum + (Number(event.request_cost) || 0), 0)
    const totalTokenCost = filteredEvents.reduce((sum, event) => sum + (Number(event.token_cost) || 0), 0)
    const totalCost = totalRequestCost + totalTokenCost
    
    const totalApiCalls = filteredEvents.reduce((sum, event) => sum + (Number(event.api_calls) || 0), 0)
    const totalTokensIn = filteredEvents.reduce((sum, event) => sum + (Number(event.tokens_in) || 0), 0)
    const totalTokensOut = filteredEvents.reduce((sum, event) => sum + (Number(event.tokens_out) || 0), 0)
    
    const safe = v => (isNaN(v) ? 0 : v)
    return {
      totalRequestCost: safe(totalRequestCost),
      totalTokenCost: safe(totalTokenCost),
      totalCost: safe(totalCost),
      totalApiCalls: safe(totalApiCalls),
      totalTokensIn: safe(totalTokensIn),
      totalTokensOut: safe(totalTokensOut),
      avgCostPerRequest: totalApiCalls > 0 ? safe(totalCost / totalApiCalls) : 0,
      avgCostPerToken: (totalTokensIn + totalTokensOut) > 0 ? safe(totalCost / ((totalTokensIn + totalTokensOut) / 1000)) : 0
    }
  }, [getFilteredEvents])

  // Get unique agents for filtering
  const getUniqueAgents = useCallback(() => {
    return Array.from(new Set(meterEvents.map(event => event.agent_id)))
  }, [meterEvents])

  const openModal = useCallback(() => {
    setShowModal(true)
    setNewProjectName('')
    setNewProjectDescription('')
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setNewProjectName('')
    setNewProjectDescription('')
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (newProjectName.trim()) {
      actions.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim()
      })
      closeModal()
    }
  }, [newProjectName, newProjectDescription, actions, closeModal])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    } else if (e.key === 'Escape') {
      closeModal()
    }
  }, [handleSubmit, closeModal])

  const handleDeleteProject = useCallback((projectId) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      actions.deleteProject({ id: projectId })
      if (selectedProject === projectId) {
        setSelectedProject(projects.length > 1 ? projects.find(p => p.id !== projectId)?.id : null)
      }
    }
  }, [actions, selectedProject, projects])

  // Handler for copying secret key
  const handleCopySecretKey = useCallback((key) => {
    navigator.clipboard.writeText(key)
    setCopiedSecretKey(true)
    setTimeout(() => setCopiedSecretKey(false), 1500)
  }, [])

  // Handler for copying project ID
  const handleCopyProjectId = useCallback((id) => {
    navigator.clipboard.writeText(id)
    setCopiedProjectId(true)
    setTimeout(() => setCopiedProjectId(false), 1500)
  }, [])

  const selectedProjectData = projects.find(p => p.id === selectedProject)
  const filteredEvents = getFilteredEvents()
  const revenueStats = getRevenueStats()
  const uniqueAgents = getUniqueAgents()

  return (
    <Fragment>
      <div className={styles.dashboard}>
        <div className={styles.container} style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>

          {/* Dashboard Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#1f2937' }}>Dashboard</h1>
            <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Manage your agents, track usage, and monitor revenue</p>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1rem'
            }}>
              Error: {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div style={{ marginBottom: '2rem', borderBottom: '2px solid #e5e7eb' }}>
            <nav style={{ display: 'flex', gap: '2rem' }}>
              {[
                { id: 'projects', label: 'Project Settings', icon: '⚙️' },
                { id: 'metering', label: 'Metering & Tracking', icon: '📊' },
                { id: 'billing', label: 'Pricing & Billing', icon: '💰' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '1rem 1.5rem',
                    border: 'none',
                    background: 'none',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                    borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Project Settings Tab */}
          {activeTab === 'projects' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                {/* Projects List */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>Your Projects</h3>
                    <button className={styles.button} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={openModal}>+ New Project</button>
                  </div>

                  {(loading && projects.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading projects...</div>
                  ) : projects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      No projects yet. Create your first project to get started.
                    </div>
                  ) : (
                    projects.map(project => (
                      <div key={project.id}
                           onClick={() => setSelectedProject(project.id)}
                           style={{
                             padding: '1rem',
                             border: selectedProject === project.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                             borderRadius: '6px',
                             marginBottom: '0.75rem',
                             cursor: 'pointer',
                             backgroundColor: selectedProject === project.id ? '#eff6ff' : 'white'
                           }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontWeight: '500', color: '#1f2937' }}>{project.name}</h4>
                            {project.description && (
                              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>{project.description}</p>
                            )}
                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>ID: {project.id}</p>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Created: {project.created}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              backgroundColor: project.status === 'Active' ? '#10b981' : '#f59e0b',
                              color: 'white'
                            }}>
                              {project.status}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProject(project.id)
                              }}
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                border: '1px solid #ef4444',
                                borderRadius: '4px',
                                background: 'white',
                                color: '#ef4444',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Project Details */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem' }}>Project Configuration</h3>

                  {selectedProjectData ? (
                    <>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Project ID</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={selectedProjectData.id}
                            readOnly
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              backgroundColor: '#f9fafb',
                              fontFamily: 'monospace'
                            }}
                          />
                          <button
                            onClick={() => handleCopyProjectId(selectedProjectData.id)}
                            style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', position: 'relative' }}
                          >
                            📋
                            {copiedProjectId && (
                              <span style={{
                                position: 'absolute',
                                top: '-2.2rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#2563eb',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                whiteSpace: 'nowrap',
                                zIndex: 10
                              }}>
                                Copied!
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Project Secret Key</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                          <input
                            type={showSecretKey ? 'text' : 'password'}
                            value={selectedProjectData.secret_key || 'sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890'}
                            readOnly
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              backgroundColor: '#f9fafb',
                              fontFamily: 'monospace'
                            }}
                          />
                          <button
                            onClick={() => setShowSecretKey(v => !v)}
                            style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
                            aria-label={showSecretKey ? 'Hide secret key' : 'Show secret key'}
                          >
                            {showSecretKey ? '🙈' : '👁️'}
                          </button>
                          <button
                            onClick={() => handleCopySecretKey(selectedProjectData.secret_key || 'sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890')}
                            style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer', position: 'relative' }}
                          >
                            📋
                            {copiedSecretKey && (
                              <span style={{
                                position: 'absolute',
                                top: '-2.2rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#2563eb',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                whiteSpace: 'nowrap',
                                zIndex: 10
                              }}>
                                Copied!
                              </span>
                            )}
                          </button>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#ef4444', marginTop: '0.5rem' }}>⚠️ Keep this secret key secure. It provides full access to your project.</p>
                      </div>

                      <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '6px', marginBottom: '1.5rem' }}>
                        <h4 style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#1f2937' }}>SDK Integration Example</h4>
                        <pre style={{ fontSize: '0.8rem', color: '#374151', overflow: 'auto' }}>{`from agentmeter import AgentMeter

meter = AgentMeter(
    project_id="${selectedProjectData.id}",
    project_secret_key="${selectedProjectData.secret_key || 'sk_live_abc123...'}",
    agent_id="your-agent-id"
)`}</pre>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={styles.button} style={{ flex: 1, fontSize: '0.9rem' }}>🔄 Regenerate Keys</button>
                        <button className={classNames(styles.button, styles.buttonSecondary)} style={{ flex: 1, fontSize: '0.9rem' }}>⚙️ Settings</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      Select a project to view its configuration
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metering & Tracking Tab */}
          {activeTab === 'metering' && (
            <div>
              {/* Stats Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { title: 'API Requests', subtitle: 'Request-based metering', value: revenueStats.totalApiCalls != null ? revenueStats.totalApiCalls.toLocaleString() : '0', change: '+15%', icon: '🔄' },
                  { title: 'Input Tokens', subtitle: 'Token-based metering', value: revenueStats.totalTokensIn != null && !isNaN(revenueStats.totalTokensIn) ? (revenueStats.totalTokensIn / 1000000).toFixed(1) + 'M' : '0M', change: '+22%', icon: '📥' },
                  { title: 'Output Tokens', subtitle: 'Token-based metering', value: revenueStats.totalTokensOut != null && !isNaN(revenueStats.totalTokensOut) ? (revenueStats.totalTokensOut / 1000000).toFixed(1) + 'M' : '0M', change: '+18%', icon: '📤' },
                  { title: 'Request Revenue', subtitle: 'API-based billing', value: '$' + (revenueStats.totalRequestCost != null ? revenueStats.totalRequestCost.toFixed(3) : '0.000'), change: '+15%', icon: '💰' },
                  { title: 'Token Revenue', subtitle: 'Token-based billing', value: '$' + (revenueStats.totalTokenCost != null ? revenueStats.totalTokenCost.toFixed(3) : '0.000'), change: '+20%', icon: '💵' },
                  { title: 'Total Revenue', subtitle: 'Combined revenue', value: '$' + (revenueStats.totalCost != null ? revenueStats.totalCost.toFixed(3) : '0.000'), change: '+18%', icon: '💎' }
                ].map((stat, index) => (
                  <div key={index} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
                      <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '500' }}>{stat.change}</span>
                    </div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>{stat.value}</h3>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>{stat.title}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{stat.subtitle}</p>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>Usage Trends</h3>
                  <div style={{ height: '300px', background: 'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)', backgroundSize: '20px 20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                    📊 Chart Placeholder (Tokens/API calls over time)
                  </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>Top Agents</h3>
                  {(() => {
                    const agentStats = filteredEvents.reduce((acc, event) => {
                      if (!acc[event.agent_id]) {
                        acc[event.agent_id] = { calls: 0, revenue: 0 }
                      }
                      acc[event.agent_id].calls += event.api_calls
                      acc[event.agent_id].revenue += event.total_cost
                      return acc
                    }, {})

                    return Object.entries(agentStats)
                                 .sort(([,a], [,b]) => b.revenue - a.revenue)
                                 .slice(0, 5)
                                 .map(([agent, stats], index) => (
                                   <div key={agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: index < 4 ? '1px solid #f3f4f6' : 'none' }}>
                                     <div>
                                       <span style={{ fontWeight: '500', color: '#374151' }}>{agent}</span>
                                       <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>{stats.calls} calls</p>
                                     </div>
                                     <span style={{ color: '#10b981', fontWeight: '500' }}>${stats.revenue != null ? stats.revenue.toFixed(3) : '0.000'}</span>
                                   </div>
                                 ))
                  })()}
                </div>
              </div>

              {/* Events List */}
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>Recent Metering Events</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.875rem', color: '#374151' }}>
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      Auto-refresh
                    </label>
                    <select 
                      value={selectedAgent} 
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="all">All Agents</option>
                      {uniqueAgents.map(agent => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                    <select 
                      value={timeFilter} 
                      onChange={(e) => setTimeFilter(e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="1h">Last 1 hour</option>
                      <option value="24h">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="all">All time</option>
                    </select>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Agent ID</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>User ID</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>API Requests</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Input Tokens</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Output Tokens</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Request Cost</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Token Cost</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Total</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading events...</td>
                        </tr>
                      ) : filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>No meter events found for the selected filters</td>
                        </tr>
                      ) : (
                        filteredEvents.map(event => (
                          <tr key={event.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{event.agent_id}</td>
                            <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{event.user_id}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>{event.api_calls}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>{event.tokens_in != null ? event.tokens_in.toLocaleString() : '0'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>{event.tokens_out != null ? event.tokens_out.toLocaleString() : '0'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669' }}>${event.request_cost != null ? event.request_cost.toFixed(3) : '0.000'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', color: '#dc2626' }}>${event.token_cost != null ? event.token_cost.toFixed(3) : '0.000'}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>${event.total_cost != null ? event.total_cost.toFixed(3) : '0.000'}</td>
                            <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>{new Date(event.timestamp).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Billing Tab */}
          {activeTab === 'billing' && (
            <div>
              {/* Meter Pricing Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>Meter Pricing Configuration</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {[
                    {
                      name: 'API Request Based Metering',
                      description: 'Tracks number of API requests made to your agents',
                      unit: 'per request',
                      currentPrice: 0.001,
                      suggested: 0.0015,
                      metric: '# of requests',
                      icon: '🔄'
                    },
                    {
                      name: 'Token-Based Metering (Input)',
                      description: 'Tracks input tokens processed by your agents',
                      unit: 'per 1K input tokens',
                      currentPrice: 0.002,
                      suggested: 0.0025,
                      metric: 'Input tokens',
                      icon: '📥'
                    },
                    {
                      name: 'Token-Based Metering (Output)',
                      description: 'Tracks output tokens generated by your agents',
                      unit: 'per 1K output tokens',
                      currentPrice: 0.004,
                      suggested: 0.005,
                      metric: 'Output tokens',
                      icon: '📤'
                    }
                  ].map((meter, index) => (
                    <div key={index} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>{meter.icon}</span>
                        <h4 style={{ fontWeight: '500', color: '#1f2937' }}>{meter.name}</h4>
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{meter.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ color: '#374151', fontSize: '0.875rem', fontWeight: '500' }}>Tracks: {meter.metric}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Pricing {meter.unit}</span>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#374151' }}>Current Price</label>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: '0.5rem' }}>$</span>
                          <input
                            type="number"
                            step="0.0001"
                            value={meter.currentPrice}
                            style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                          />
                        </div>
                      </div>

                      <div style={{ padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '6px', marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#1d4ed8' }}>💡 Suggested: ${meter.suggested} {meter.unit}</p>
                      </div>

                      <button className={styles.button} style={{ width: '100%', fontSize: '0.875rem' }}>Update Pricing</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Operations */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>Revenue Operations</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Revenue Analytics */}
                  <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ fontWeight: '500', marginBottom: '1rem', color: '#1f2937' }}>Revenue Analytics</h4>

                    {[
                      { label: 'Monthly Recurring Revenue (MRR)', value: '$1,234', trend: '+12%' },
                      { label: 'Average Revenue Per Agent (ARPA)', value: '$45.67', trend: '+8%' },
                      { label: 'Customer Lifetime Value (CLV)', value: '$892', trend: '+15%' },
                      { label: 'Revenue per API Call', value: '$0.0037', trend: '+5%' }
                    ].map((metric, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: index < 3 ? '1px solid #f3f4f6' : 'none' }}>
                        <span style={{ color: '#374151', fontSize: '0.875rem' }}>{metric.label}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '500', color: '#1f2937' }}>{metric.value}</span>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: '0.5rem' }}>{metric.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Revenue Optimization Suggestions */}
                  <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ fontWeight: '500', marginBottom: '1rem', color: '#1f2937' }}>💡 Revenue Optimization Insights</h4>

                    {[
                      { type: 'pricing', message: 'Consider increasing token pricing by 15% based on market analysis', impact: '+$180/month' },
                      { type: 'usage', message: 'Agent "content-gen-v2" shows 40% higher engagement - promote it', impact: '+25% usage' },
                      { type: 'billing', message: 'Switch to weekly billing to improve cash flow', impact: 'Better retention' }
                    ].map((insight, index) => (
                      <div key={index} style={{ padding: '0.75rem', backgroundColor: '#f0f9ff', borderLeft: '3px solid #2563eb', marginBottom: '0.75rem', borderRadius: '0 6px 6px 0' }}>
                        <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>{insight.message}</p>
                        <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '500' }}>Expected impact: {insight.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Invoices Section */}
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: '500', color: '#1f2937' }}>Invoices & Billing History</h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                      <option>Monthly Billing</option>
                      <option>Weekly Billing</option>
                      <option>Custom Period</option>
                    </select>
                    <button className={styles.button} style={{ fontSize: '0.875rem' }}>Generate Invoice</button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Invoice #</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Period</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Usage</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Amount</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '500', color: '#374151' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'INV-2024-002', period: 'Feb 1-28, 2024', usage: '45.2K tokens, 1.2K requests', amount: '$45.67', status: 'Paid' },
                        { id: 'INV-2024-001', period: 'Jan 1-31, 2024', usage: '38.1K tokens, 980 requests', amount: '$38.42', status: 'Paid' },
                        { id: 'INV-2023-012', period: 'Dec 1-31, 2023', usage: '52.3K tokens, 1.4K requests', amount: '$52.89', status: 'Paid' }
                      ].map((invoice, index) => (
                        <tr key={invoice.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '500' }}>{invoice.id}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{invoice.period}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>{invoice.usage}</td>
                          <td style={{ padding: '0.75rem', fontWeight: '500' }}>{invoice.amount}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              backgroundColor: '#10b981',
                              color: 'white'
                            }}>
                              {invoice.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer', marginRight: '0.25rem' }}>📄 View</button>
                            <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>⬇️ Download</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>Create New Project</h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem',
                  borderRadius: '4px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#374151'}
                onMouseLeave={(e) => e.target.style.color = '#6b7280'}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter project name..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  autoFocus
                />
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Choose a descriptive name for your project. This will help you identify it in your dashboard.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Enter project description..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    minHeight: '80px',
                    resize: 'vertical',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Add a description to help you remember what this project is for.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f9fafb'
                    e.target.style.borderColor = '#9ca3af'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'white'
                    e.target.style.borderColor = '#d1d5db'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim() || loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: newProjectName.trim() && !loading ? '#2563eb' : '#9ca3af',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: newProjectName.trim() && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (newProjectName.trim() && !loading) {
                      e.target.style.backgroundColor = '#1d4ed8'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newProjectName.trim() && !loading) {
                      e.target.style.backgroundColor = '#2563eb'
                    }
                  }}
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default withRouter(
  connect(
    state => ({
      projects: state.project.projects || [],
      currentProject: state.project.currentProject,
      meterEvents: state.project.meterEvents || [],
      loading: state.project.loading,
      error: state.project.error
    }),
    dispatch => ({
      actions: bindActionCreators({
        ...projectActions
      }, dispatch)
    })
  )(Dashboard)
)
