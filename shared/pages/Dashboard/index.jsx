import React, { useEffect, useState, useCallback, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { withRouter } from 'utils/withRouter'
import * as projectActions from 'actions/project'
import classNames from 'classnames'
import styles from './style.css'

const Dashboard = ({ actions, projects, currentProject, meterEvents, billingRecords, loading, error }) => {
  const navigate = useNavigate();
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
  const [revenueData, setRevenueData] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    total: 0
  })
  const [apiConnectionError, setApiConnectionError] = useState(null)
  // Removed activeSubTab state - using sidebar navigation only

  // Auth wall: redirect to login if not authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [navigate]);

  // Get current user email and setup session token
  const userEmail = localStorage.getItem('userEmail');
  const setupSessionToken = useCallback(() => {
    // Create a session token for API authentication
    const userId = localStorage.getItem('userId') || 'demo-user-123'
    const sessionToken = `session_${userId}_${Date.now()}`
    localStorage.setItem('sessionToken', sessionToken)
    return sessionToken
  }, [])

  // Setup session token on mount
  useEffect(() => {
    if (!localStorage.getItem('sessionToken')) {
      setupSessionToken()
    }
  }, [setupSessionToken])

  // Projects are already filtered by the backend for the authenticated user
  const userProjects = projects;

  // Load projects on component mount
  useEffect(() => {
    setApiConnectionError(null)
    actions.loadProjects()
  }, [actions])

  // Set first project as selected when projects load
  useEffect(() => {
    if (userProjects.length > 0 && !selectedProject) {
      setSelectedProject(userProjects[0].id)
    }
  }, [userProjects, selectedProject])

  // Load meter events for selected project (only when switching project)
  useEffect(() => {
    if (selectedProject) {
      const params = {
        project_id: selectedProject,
        limit: 100
      }
      setApiConnectionError(null)
      actions.loadMeterEvents(params)
    }
  }, [selectedProject, actions])

  // Load billing records when billing tab is active and project changes
  useEffect(() => {
    if ((activeTab === 'revenue' || activeTab === 'billing-events' || activeTab === 'invoices') && selectedProject) {
      actions.loadBillingRecords({ project_id: selectedProject })
    }
  }, [activeTab, selectedProject, actions])

  // Auto-refresh meter events
  useEffect(() => {
    if (autoRefresh && selectedProject && (activeTab === 'meters' || activeTab === 'events')) {
      const interval = setInterval(() => {
        actions.loadMeterEvents({ project_id: selectedProject, limit: 100 })
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, selectedProject, activeTab, actions])

  // Handle API connection errors from Redux state
  useEffect(() => {
    if (error) {
      setApiConnectionError(error)
    }
  }, [error])

  // Generate mock revenue data for analytics
  useEffect(() => {
    const generateRevenueData = () => {
      const now = new Date()
      const daily = []
      const weekly = []
      const monthly = []

      // Generate 30 days of daily data
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        daily.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 500) + 100,
          requests: Math.floor(Math.random() * 1000) + 200,
          tokens: Math.floor(Math.random() * 50000) + 10000
        })
      }

      // Generate 12 weeks of weekly data
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        weekly.push({
          week: `Week ${12 - i}`,
          revenue: Math.floor(Math.random() * 3000) + 1000,
          requests: Math.floor(Math.random() * 7000) + 2000,
          tokens: Math.floor(Math.random() * 300000) + 100000
        })
      }

      // Generate 12 months of monthly data
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        monthly.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: Math.floor(Math.random() * 12000) + 5000,
          requests: Math.floor(Math.random() * 30000) + 10000,
          tokens: Math.floor(Math.random() * 1200000) + 500000
        })
      }

      const total = daily.reduce((sum, day) => sum + day.revenue, 0)

      setRevenueData({ daily, weekly, monthly, total })
    }

    generateRevenueData()
  }, [])

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

  // Get meter instance stats
  const getMeterInstanceStats = useCallback(() => {
    const filteredEvents = getFilteredEvents()
    const agentStats = {}

    filteredEvents.forEach(event => {
      if (!agentStats[event.agent_id]) {
        agentStats[event.agent_id] = {
          agent_id: event.agent_id,
          total_requests: 0,
          total_tokens_in: 0,
          total_tokens_out: 0,
          total_cost: 0,
          last_activity: event.timestamp,
          request_count: 0
        }
      }

      const stats = agentStats[event.agent_id]
      stats.total_requests += Number(event.api_calls) || 0
      stats.total_tokens_in += Number(event.tokens_in) || 0
      stats.total_tokens_out += Number(event.tokens_out) || 0
      stats.total_cost += Number(event.total_cost) || 0
      stats.request_count += 1

      if (new Date(event.timestamp) > new Date(stats.last_activity)) {
        stats.last_activity = event.timestamp
      }
    })

    return Object.values(agentStats).sort((a, b) => b.total_cost - a.total_cost)
  }, [getFilteredEvents])

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
        setSelectedProject(userProjects.length > 1 ? userProjects.find(p => p.id !== projectId)?.id : null)
      }
    }
  }, [actions, selectedProject, userProjects])

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

  // Removed sub-tab navigation functions - using sidebar only

  const selectedProjectData = userProjects.find(p => p.id === selectedProject)
  const filteredEvents = getFilteredEvents()
  const revenueStats = getRevenueStats()
  const uniqueAgents = getUniqueAgents()
  const meterInstanceStats = getMeterInstanceStats()

  // Simple chart component for revenue visualization
  const SimpleBarChart = ({ data, dataKey, title, height = 200 }) => (
    <div className={styles.chartContainer}>
      <h4 className={styles.chartTitle}>{title}</h4>
      <div className={styles.barChart} style={{ height }}>
        {data.slice(-10).map((item, index) => {
          const maxValue = Math.max(...data.map(d => d[dataKey]))
          const barHeight = (item[dataKey] / maxValue) * (height - 40)
          return (
            <div key={index} className={styles.barContainer}>
              <div 
                className={styles.bar} 
                style={{ height: `${barHeight}px` }}
                title={`${item[dataKey]}`}
              />
              <div className={styles.barLabel}>
                {item.date ? new Date(item.date).getDate() : 
                 item.week ? item.week.split(' ')[1] : 
                 item.month ? item.month.split(' ')[0] : index + 1}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Fragment>
      <div className={styles.dashboard}>
        <div className={styles.container}>
          {/* Error Display */}
          {(error || apiConnectionError) && (
            <div className={styles.errorAlert}>
              Error: {error || apiConnectionError}
            </div>
          )}

          {/* Dashboard Layout */}
          <div className={styles.dashboardLayout}>
            {/* Sidebar Navigation */}
            <div className={styles.sidebar}>
              {/* Project Management Section */}
              <div className={styles.sidebarSection}>
                <div className={styles.sectionHeader}>PROJECT MANAGEMENT</div>
                <ul className={styles.sidebarNav}>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('projects')}
                      className={`${styles.navButton} ${activeTab === 'projects' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>📁</span>
                      Project Catalogue
                    </button>
                  </li>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('keys')}
                      className={`${styles.navButton} ${activeTab === 'keys' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>🔑</span>
                      Key Management
                    </button>
                  </li>
                </ul>
              </div>

              {/* Metering Section */}
              <div className={styles.sidebarSection}>
                <div className={styles.sectionHeader}>METERING</div>
                <ul className={styles.sidebarNav}>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('meters')}
                      className={`${styles.navButton} ${activeTab === 'meters' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>📊</span>
                      Meter Usage
                    </button>
                  </li>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('events')}
                      className={`${styles.navButton} ${activeTab === 'events' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>📋</span>
                      Metering Events
                    </button>
                  </li>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('usage-stats')}
                      className={`${styles.navButton} ${activeTab === 'usage-stats' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>📈</span>
                      Usage Stats
                    </button>
                  </li>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('query')}
                      className={`${styles.navButton} ${activeTab === 'query' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>🔍</span>
                      Query
                    </button>
                  </li>
                </ul>
              </div>

              {/* Billing Section */}
              <div className={styles.sidebarSection}>
                <div className={styles.sectionHeader}>BILLING</div>
                <ul className={styles.sidebarNav}>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('revenue')}
                      className={`${styles.navButton} ${activeTab === 'revenue' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>💰</span>
                      Revenue
                    </button>
                  </li>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('billing-events')}
                      className={`${styles.navButton} ${activeTab === 'billing-events' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>📄</span>
                      Billing Events
                    </button>
                  </li>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('invoices')}
                      className={`${styles.navButton} ${activeTab === 'invoices' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>📋</span>
                      Invoices
                    </button>
                  </li>
                </ul>
              </div>

              {/* Analytics Section */}
              <div className={styles.sidebarSection}>
                <div className={styles.sectionHeader}>ANALYTICS</div>
                <ul className={styles.sidebarNav}>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className={`${styles.navButton} ${activeTab === 'analytics' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>📈</span>
                      Overview
                    </button>
                  </li>
                </ul>
              </div>

              {/* Project Infrastructure Section */}
              <div className={styles.sidebarSection}>
                <div className={styles.sectionHeader}>PROJECT INFRASTRUCTURE</div>
                <ul className={styles.sidebarNav}>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('project-wallet')}
                      className={`${styles.navButton} ${activeTab === 'project-wallet' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>🏦</span>
                      Project Wallet
                    </button>
                  </li>
                </ul>
              </div>

              {/* Developers Section */}
              <div className={styles.sidebarSection}>
                <div className={styles.sectionHeader}>DEVELOPERS</div>
                <ul className={styles.sidebarNav}>
                  <li className={styles.navItem}>
                    <button
                      onClick={() => setActiveTab('api-docs')}
                      className={`${styles.navButton} ${activeTab === 'api-docs' ? styles.active : ''}`}
                    >
                      <span className={styles.navIcon}>⚡</span>
                      API & SDK
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
              {/* Project Catalogue Tab */}
              {activeTab === 'projects' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>📁 Project Catalogue</h2>
                  <div className={styles.projectsGrid}>
                    {/* Projects List */}
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Your Projects</h3>
                        <button className={styles.button} onClick={openModal}>+ New Project</button>
                      </div>

                      {(loading && userProjects.length === 0) ? (
                        <div className={styles.emptyState}>Loading projects...</div>
                      ) : userProjects.length === 0 ? (
                        <div className={styles.emptyState}>
                          No projects yet. Create your first project to get started.
                        </div>
                      ) : (
                        userProjects.map(project => (
                          <div key={project.id}
                               onClick={() => setSelectedProject(project.id)}
                               className={`${styles.projectCard} ${selectedProject === project.id ? styles.selected : ''}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <h4 className={styles.projectName}>{project.name}</h4>
                                {project.description && (
                                  <p className={styles.projectDescription}>{project.description}</p>
                                )}
                                <p className={styles.projectMeta}>ID: {project.id}</p>
                                <p className={styles.projectMeta}>Created: {project.created}</p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                <span className={`${styles.badge} ${project.status === 'Active' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                  {project.status}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteProject(project.id)
                                  }}
                                  className={styles.buttonDanger}
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
                    <div className={styles.card}>
                      <h3 className={styles.cardTitle}>Project Configuration</h3>

                      {selectedProjectData ? (
                        <div className={styles.configForm}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Project ID</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="text"
                                value={selectedProjectData.id}
                                readOnly
                                className={styles.inputReadonly}
                              />
                              <button
                                onClick={() => handleCopyProjectId(selectedProjectData.id)}
                                className={styles.iconButton}
                              >
                                📋
                                {copiedProjectId && (
                                  <span className={styles.tooltip}>Copied!</span>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.label}>Project Secret Key</label>
                            <div className={styles.inputGroup}>
                              <input
                                type={showSecretKey ? 'text' : 'password'}
                                value={selectedProjectData.secret_key || 'sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890'}
                                readOnly
                                className={styles.inputReadonly}
                              />
                              <button
                                onClick={() => setShowSecretKey(v => !v)}
                                className={styles.iconButton}
                                aria-label={showSecretKey ? 'Hide secret key' : 'Show secret key'}
                              >
                                {showSecretKey ? '🙈' : '👁️'}
                              </button>
                              <button
                                onClick={() => handleCopySecretKey(selectedProjectData.secret_key || 'sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890')}
                                className={styles.iconButton}
                              >
                                📋
                                {copiedSecretKey && (
                                  <span className={styles.tooltip}>Copied!</span>
                                )}
                              </button>
                            </div>
                            <p className={styles.warning}>⚠️ Keep this secret key secure. It provides full access to your project.</p>
                          </div>

                          <div className={styles.codeExample}>
                            <h4 className={styles.codeTitle}>SDK Integration Example</h4>
                            <pre className={styles.codeBlock}>{`from agentmeter import AgentMeter

# Initialize with CDP project wallet
meter = AgentMeter(
    project_id="${selectedProjectData.id}",
    project_secret_key="${selectedProjectData.secret_key || 'sk_live_abc123...'}",
    cdp_enabled=True
)

# All agent revenue flows to project wallet
meter.record_event(
    agent_id="your-agent-id",
    event_type="api_request",
    tokens_in=1500,
    tokens_out=800
)`}</pre>
                          </div>

                          <div className={styles.buttonGroup}>
                            <button className={styles.button}>🔄 Regenerate Keys</button>
                            <button className={styles.buttonSecondary}>⚙️ Settings</button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.emptyState}>
                          Select a project to view its configuration
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Key Management Tab */}
              {activeTab === 'keys' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>🔑 API Key Management</h2>
                  <div className={styles.card}>
                    <div className={styles.keysGrid}>
                      <div>
                        <h4 className={styles.sectionTitle}>Project API Keys</h4>
                        <div className={styles.keyList}>
                          <div className={styles.keyItem}>
                            <div className={styles.keyHeader}>
                              <span className={styles.keyLabel}>Public Key</span>
                              <span className={styles.badgeSuccess}>Active</span>
                            </div>
                            <code className={styles.keyValue}>pk_live_abc123...</code>
                          </div>
                          <div className={styles.keyItem}>
                            <div className={styles.keyHeader}>
                              <span className={styles.keyLabel}>Secret Key</span>
                              <span className={styles.badgeSuccess}>Active</span>
                            </div>
                            <code className={styles.keyValue}>sk_live_def456...</code>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className={styles.sectionTitle}>Key Actions</h4>
                        <div className={styles.actionList}>
                          <button className={styles.button}>🔄 Regenerate Keys</button>
                          <button className={styles.buttonDanger}>🗑️ Revoke Keys</button>
                          <button className={styles.buttonSuccess}>➕ Create Test Keys</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Meter Usage Tab */}
              {activeTab === 'meters' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>📊 Meter Usage</h2>
                  <p className={styles.pageDescription}>Usage statistics per meter instance (agents) with input/output token tracking</p>
                  
                  {/* Meter Instance Statistics */}
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}>Meter Instances Performance</h3>
                      <div className={styles.tableFilters}>
                        <select 
                          value={timeFilter} 
                          onChange={(e) => setTimeFilter(e.target.value)}
                          className={styles.filterSelect}
                        >
                          <option value="1h">Last 1 hour</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                          <option value="30d">Last 30 days</option>
                          <option value="all">All time</option>
                        </select>
                      </div>
                    </div>

                    {meterInstanceStats.length === 0 ? (
                      <div className={styles.emptyState}>
                        No meter data available. Start using your agents to see usage statistics.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className={styles.dataTable}>
                          <thead>
                            <tr>
                              <th>Agent ID</th>
                              <th>Total Requests</th>
                              <th>Input Tokens</th>
                              <th>Output Tokens</th>
                              <th>Total Cost</th>
                              <th>Avg Cost/Request</th>
                              <th>Last Activity</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {meterInstanceStats.map((meter, index) => (
                              <tr key={meter.agent_id}>
                                <td className={styles.tableCellMono}>{meter.agent_id}</td>
                                <td className={styles.tableCellNumber}>{meter.total_requests.toLocaleString()}</td>
                                <td className={styles.tableCellNumber}>{meter.total_tokens_in.toLocaleString()}</td>
                                <td className={styles.tableCellNumber}>{meter.total_tokens_out.toLocaleString()}</td>
                                <td className={`${styles.tableCellNumber} ${styles.tableCellCurrency}`}>${meter.total_cost.toFixed(4)}</td>
                                <td className={`${styles.tableCellNumber} ${styles.tableCellCurrency}`}>
                                  ${meter.total_requests > 0 ? (meter.total_cost / meter.total_requests).toFixed(4) : '0.0000'}
                                </td>
                                <td className={styles.tableCellMono}>{new Date(meter.last_activity).toLocaleString()}</td>
                                <td>
                                  <span className={`${styles.badge} ${
                                    Date.now() - new Date(meter.last_activity).getTime() < 3600000 ? styles.badgeSuccess : styles.badgeWarning
                                  }`}>
                                    {Date.now() - new Date(meter.last_activity).getTime() < 3600000 ? 'Active' : 'Idle'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Real-time Usage Overview */}
                  <div className={styles.statsGrid}>
                    {[
                      { title: 'Active Agents', value: meterInstanceStats.filter(m => Date.now() - new Date(m.last_activity).getTime() < 3600000).length, icon: '🤖', change: '+12%' },
                      { title: 'Total API Calls', value: revenueStats.totalApiCalls.toLocaleString(), icon: '🔄', change: '+18%' },
                      { title: 'Input Tokens', value: (revenueStats.totalTokensIn / 1000000).toFixed(1) + 'M', icon: '📥', change: '+22%' },
                      { title: 'Output Tokens', value: (revenueStats.totalTokensOut / 1000000).toFixed(1) + 'M', icon: '📤', change: '+15%' },
                      { title: 'Total Usage Cost', value: '$' + revenueStats.totalCost.toFixed(2), icon: '💰', change: '+20%' },
                      { title: 'Avg Cost per Call', value: '$' + revenueStats.avgCostPerRequest.toFixed(4), icon: '📊', change: '+8%' }
                    ].map((stat, index) => (
                      <div key={index} className={styles.statCard}>
                        <div className={styles.statHeader}>
                          <span className={styles.statIcon}>{stat.icon}</span>
                          <span className={styles.statChange}>{stat.change}</span>
                        </div>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={styles.statTitle}>{stat.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metering Events Tab */}
              {activeTab === 'events' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>📋 Metering Events</h2>
                  <p className={styles.pageDescription}>Detailed list of all metering events with necessary data fields</p>
                  
                  {/* Events List */}
                  <div className={styles.dataTableContainer}>
                    <div className={styles.tableHeader}>
                      <h3 className={styles.tableTitle}>Event Log</h3>
                      <div className={styles.tableFilters}>
                        <label className={styles.filterCheckbox}>
                          <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                          />
                          Auto-refresh (30s)
                        </label>
                        <select 
                          value={selectedAgent} 
                          onChange={(e) => setSelectedAgent(e.target.value)}
                          className={styles.filterSelect}
                        >
                          <option value="all">All Agents</option>
                          {uniqueAgents.map(agent => (
                            <option key={agent} value={agent}>{agent}</option>
                          ))}
                        </select>
                        <select 
                          value={timeFilter} 
                          onChange={(e) => setTimeFilter(e.target.value)}
                          className={styles.filterSelect}
                        >
                          <option value="1h">Last 1 hour</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                          <option value="30d">Last 30 days</option>
                          <option value="all">All time</option>
                        </select>
                        <button 
                          className={styles.button}
                          onClick={() => actions.loadMeterEvents({ project_id: selectedProject, limit: 100 })}
                        >
                          🔄 Refresh
                        </button>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Event ID</th>
                            <th>Agent ID</th>
                            <th>User ID</th>
                            <th>API Requests</th>
                            <th>Input Tokens</th>
                            <th>Output Tokens</th>
                            <th>Request Cost</th>
                            <th>Token Cost</th>
                            <th>Total Cost</th>
                            <th>Timestamp</th>
                            <th>Project</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && filteredEvents.length === 0 ? (
                            <tr>
                              <td colSpan="11" className={styles.emptyCell}>Loading events...</td>
                            </tr>
                          ) : filteredEvents.length === 0 ? (
                            <tr>
                              <td colSpan="11" className={styles.emptyCell}>No meter events found for the selected filters</td>
                            </tr>
                          ) : (
                            filteredEvents
                              .filter(event => selectedAgent === 'all' || event.agent_id === selectedAgent)
                              .map(event => (
                              <tr key={event.id}>
                                <td className={styles.tableCellMono}>{event.id}</td>
                                <td className={styles.tableCellMono}>{event.agent_id}</td>
                                <td className={styles.tableCellMono}>{event.user_id}</td>
                                <td className={styles.tableCellNumber}>{event.api_calls}</td>
                                <td className={styles.tableCellNumber}>{event.tokens_in != null ? event.tokens_in.toLocaleString() : '0'}</td>
                                <td className={styles.tableCellNumber}>{event.tokens_out != null ? event.tokens_out.toLocaleString() : '0'}</td>
                                <td className={`${styles.tableCellNumber} ${styles.tableCellCurrency}`}>${event.request_cost != null ? event.request_cost.toFixed(4) : '0.0000'}</td>
                                <td className={`${styles.tableCellNumber} ${styles.tableCellCurrency}`}>${event.token_cost != null ? event.token_cost.toFixed(4) : '0.0000'}</td>
                                <td className={`${styles.tableCellNumber} ${styles.tableCellCurrency}`}>${event.total_cost != null ? event.total_cost.toFixed(4) : '0.0000'}</td>
                                <td className={styles.tableCellMono}>{new Date(event.timestamp).toLocaleString()}</td>
                                <td className={styles.tableCellMono}>{event.project_id}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Event Summary */}
                    <div className={styles.eventSummary}>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Total Events:</span>
                        <span className={styles.summaryValue}>{filteredEvents.filter(event => selectedAgent === 'all' || event.agent_id === selectedAgent).length}</span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Unique Agents:</span>
                        <span className={styles.summaryValue}>{uniqueAgents.length}</span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Time Range:</span>
                        <span className={styles.summaryValue}>{timeFilter === 'all' ? 'All Time' : timeFilter.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Stats Tab */}
              {activeTab === 'usage-stats' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>📈 Usage Analytics Dashboard</h2>
                  <p className={styles.pageDescription}>Analytics dashboard with proper charts and number meters</p>
                  
                  {/* Key Performance Indicators */}
                  <div className={styles.statsGrid}>
                    {[
                      { title: 'Daily Active Agents', value: '142', change: '+8.2%', icon: '🤖', description: 'Agents active today' },
                      { title: 'Peak Usage Time', value: '2-4 PM EST', change: 'Consistent', icon: '⏰', description: 'Highest traffic window' },
                      { title: 'Avg Session Length', value: '24.7 min', change: '+12%', icon: '⏱️', description: 'Average agent session' },
                      { title: 'Error Rate', value: '0.24%', change: '-15%', icon: '⚠️', description: 'Failed requests rate' },
                      { title: 'User Retention (7d)', value: '87.3%', change: '+5.1%', icon: '🔄', description: '7-day user retention' },
                      { title: 'API Success Rate', value: '99.76%', change: '+0.02%', icon: '✅', description: 'Successful API calls' },
                      { title: 'Response Time', value: '245ms', change: '-8%', icon: '⚡', description: 'Average response time' },
                      { title: 'Concurrent Users', value: '1,247', change: '+18%', icon: '👥', description: 'Active concurrent users' }
                    ].map((stat, index) => (
                      <div key={index} className={styles.statCard}>
                        <div className={styles.statHeader}>
                          <span className={styles.statIcon}>{stat.icon}</span>
                          <span className={styles.statChange}>{stat.change}</span>
                        </div>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={styles.statTitle}>{stat.title}</div>
                        <div className={styles.statDescription}>{stat.description}</div>
                      </div>
                    ))}
                  </div>

                  {/* Analytics Charts */}
                  <div className={styles.chartsGrid}>
                    <div className={styles.chartCard}>
                      <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Usage Trends (Last 30 Days)</h3>
                        <div className={styles.chartControls}>
                          <select className={styles.filterSelect} defaultValue="requests">
                            <option value="requests">API Requests</option>
                            <option value="tokens">Token Usage</option>
                            <option value="cost">Cost Analysis</option>
                          </select>
                        </div>
                      </div>
                      <SimpleBarChart 
                        data={revenueData.daily} 
                        dataKey="requests" 
                        title="Daily API Requests"
                        height={250}
                      />
                    </div>

                    <div className={styles.chartCard}>
                      <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Token Usage Distribution</h3>
                      </div>
                      <SimpleBarChart 
                        data={revenueData.daily} 
                        dataKey="tokens" 
                        title="Daily Token Usage"
                        height={250}
                      />
                    </div>

                    <div className={styles.chartCard}>
                      <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Top Performing Agents</h3>
                      </div>
                      <div className={styles.topAgentsList}>
                        {meterInstanceStats.slice(0, 10).map((agent, index) => (
                          <div key={agent.agent_id} className={styles.agentItem}>
                            <div className={styles.agentRank}>#{index + 1}</div>
                            <div className={styles.agentInfo}>
                              <div className={styles.agentName}>{agent.agent_id}</div>
                              <div className={styles.agentCalls}>{agent.total_requests.toLocaleString()} requests</div>
                              <div className={styles.agentTokens}>
                                {((agent.total_tokens_in + agent.total_tokens_out) / 1000).toFixed(1)}K tokens
                              </div>
                            </div>
                            <div className={styles.agentRevenue}>${agent.total_cost.toFixed(3)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.chartCard}>
                      <div className={styles.chartHeader}>
                        <h3 className={styles.chartTitle}>Geographic Distribution</h3>
                      </div>
                      <div className={styles.geoDistribution}>
                        {[
                          { region: 'North America', percentage: 45, requests: '12.3K' },
                          { region: 'Europe', percentage: 32, requests: '8.7K' },
                          { region: 'Asia Pacific', percentage: 18, requests: '4.9K' },
                          { region: 'Other', percentage: 5, requests: '1.4K' }
                        ].map((region, index) => (
                          <div key={index} className={styles.geoItem}>
                            <div className={styles.geoBar}>
                              <div 
                                className={styles.geoBarFill} 
                                style={{ width: `${region.percentage}%` }}
                              />
                            </div>
                            <div className={styles.geoInfo}>
                              <span className={styles.geoRegion}>{region.region}</span>
                              <span className={styles.geoPercentage}>{region.percentage}%</span>
                              <span className={styles.geoRequests}>{region.requests}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Tab */}
              {activeTab === 'revenue' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>💰 Revenue Analytics & Insights</h2>
                  
                  {/* Revenue Operations */}
                  <div className={styles.revenueGrid}>
                    {/* Revenue Analytics */}
                    <div className={styles.revenueCard}>
                      <h4 className={styles.revenueCardTitle}>📈 Revenue Analytics</h4>

                      {[
                        { label: 'Monthly Recurring Revenue (MRR)', value: '$1,234', trend: '+12%' },
                        { label: 'Average Revenue Per Agent (ARPA)', value: '$45.67', trend: '+8%' },
                        { label: 'Customer Lifetime Value (CLV)', value: '$892', trend: '+15%' },
                        { label: 'Revenue per API Call', value: '$0.0037', trend: '+5%' }
                      ].map((metric, index) => (
                        <div key={index} className={styles.metricItem}>
                          <span className={styles.metricLabel}>{metric.label}</span>
                          <div className={styles.metricValueGroup}>
                            <span className={styles.metricValue}>{metric.value}</span>
                            <span className={styles.metricTrend}>{metric.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Revenue Optimization Suggestions */}
                    <div className={styles.revenueCard}>
                      <h4 className={styles.revenueCardTitle}>💡 Revenue Optimization Insights</h4>

                      {[
                        { type: 'pricing', message: 'Consider increasing token pricing by 15% based on market analysis', impact: '+$180/month' },
                        { type: 'usage', message: 'Agent "content-gen-v2" shows 40% higher engagement - promote it', impact: '+25% usage' },
                        { type: 'billing', message: 'Switch to weekly billing to improve cash flow', impact: 'Better retention' }
                      ].map((insight, index) => (
                        <div key={index} className={styles.insightCard}>
                          <p className={styles.insightMessage}>{insight.message}</p>
                          <span className={styles.insightImpact}>Expected impact: {insight.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Query Tab */}
              {activeTab === 'query' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>🔍 Query</h2>
                  <div className={styles.card}>
                    <div className={styles.emptyState}>
                      Query builder coming soon...
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Events Tab */}
              {activeTab === 'billing-events' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>📄 Billing Events</h2>
                  <div className={styles.card}>
                    <div className={styles.emptyState}>
                      Billing events coming soon...
                    </div>
                  </div>
                </div>
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>📋 Invoices & Billing History</h2>
                  
                  <div className={styles.dataTableContainer}>
                    <div className={styles.tableHeader}>
                      <h3 className={styles.tableTitle}>Invoice History</h3>
                      <div className={styles.tableFilters}>
                        <select className={styles.filterSelect}>
                          <option>Monthly Billing</option>
                          <option>Weekly Billing</option>
                          <option>Custom Period</option>
                        </select>
                        <button className={styles.button}>Generate Invoice</button>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Period</th>
                            <th>Usage</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && (!billingRecords || billingRecords.length === 0) ? (
                            <tr>
                              <td colSpan="6" className={styles.emptyCell}>Loading invoices...</td>
                            </tr>
                          ) : !billingRecords || billingRecords.length === 0 ? (
                            <tr>
                              <td colSpan="6" className={styles.emptyCell}>No invoices found for this project.</td>
                            </tr>
                          ) : (
                            billingRecords.map((invoice, index) => (
                            <tr key={invoice.id}>
                              <td className={styles.tableCellMono}>{invoice.id}</td>
                              <td>{invoice.period_start} - {invoice.period_end}</td>
                              <td className={styles.tableCellMono}>{invoice.usage}</td>
                              <td className={`${styles.tableCellNumber} ${styles.tableCellCurrency}`}>${invoice.amount != null ? Number(invoice.amount).toFixed(2) : '0.00'}</td>
                              <td>
                                <span className={`${styles.badge} ${invoice.status === 'Paid' ? styles.badgeSuccess : styles.badgeWarning}`}>
                                  {invoice.status}
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionButtons}>
                                  <button className={styles.iconButton}>📄 View</button>
                                  <button className={styles.iconButton}>⬇️ Download</button>
                                </div>
                              </td>
                            </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>📈 Analytics Overview</h2>
                  <p className={styles.pageDescription}>Google Analytics-style insights for your agent operations</p>
                  <div className={styles.card}>
                    <div className={styles.emptyState}>
                      Analytics dashboard coming soon...
                    </div>
                  </div>
                </div>
              )}

              {/* API Docs Tab */}
              {activeTab === 'api-docs' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>⚡ API & SDK</h2>
                  <p className={styles.pageDescription}>Developer tools and API documentation</p>
                  <div className={styles.card}>
                    <div className={styles.emptyState}>
                      Developer documentation coming soon...
                    </div>
                  </div>
                </div>
              )}

              {/* Project Wallet Tab (CDP-Enhanced) */}
              {activeTab === 'project-wallet' && (
                <div className={styles.tabContent}>
                  <h2 className={styles.pageTitle}>🏦 Project Wallet</h2>
                  <p className={styles.pageDescription}>CDP-powered project wallet where all agent revenue automatically flows together</p>
                  
                  {selectedProjectData ? (
                    <>
                      {/* Project Wallet Overview */}
                      <div className={styles.card}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>Project CDP Wallet</h3>
                          <div className={styles.tableFilters}>
                            <button className={styles.button}>💰 Fund Wallet</button>
                            <button className={styles.buttonSecondary}>⚙️ Manage Policy</button>
                          </div>
                        </div>

                        <div className={styles.configForm}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Project ID</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="text"
                                value={selectedProjectData.id}
                                readOnly
                                className={styles.inputReadonly}
                              />
                            </div>
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.label}>Wallet Address</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="text"
                                value="0x7B4C...D8F2"
                                readOnly
                                className={styles.inputReadonly}
                              />
                              <button className={styles.iconButton}>📋</button>
                            </div>
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.label}>Smart Account Address</label>
                            <div className={styles.inputGroup}>
                              <input
                                type="text"
                                value="0x9E6A...C4B1"
                                readOnly
                                className={styles.inputReadonly}
                              />
                              <button className={styles.iconButton}>📋</button>
                            </div>
                          </div>

                          <div className={styles.revenueGrid}>
                            <div className={styles.balanceCard}>
                              <h4>ETH Balance</h4>
                              <div className={styles.balanceValue}>2.456 ETH</div>
                              <div className={styles.balanceUsd}>≈ $4,089.24</div>
                            </div>
                            <div className={styles.balanceCard}>
                              <h4>USDC Balance</h4>
                              <div className={styles.balanceValue}>8,742.31 USDC</div>
                              <div className={styles.balanceUsd}>≈ $8,742.31</div>
                            </div>
                            <div className={styles.balanceCard}>
                              <h4>Total Value</h4>
                              <div className={styles.balanceValue}>$12,831.55</div>
                              <div className={styles.balanceChange}>+$1,234 this month</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Project Wallet Features */}
                      <div className={styles.pricingGrid}>
                        <div className={styles.pricingCard}>
                          <div className={styles.pricingHeader}>
                            <span className={styles.pricingIcon}>🏦</span>
                            <h4 className={styles.pricingTitle}>Unified Revenue Collection</h4>
                          </div>
                          <p className={styles.pricingDescription}>
                            All agent earnings automatically flow into your project's CDP wallet for centralized management.
                          </p>
                          <div className={styles.pricingDetails}>
                            <span className={styles.pricingMetric}>✅ Automatic agent revenue aggregation</span>
                            <span className={styles.pricingUnit}>✅ Real-time balance updates</span>
                          </div>
                          <button className={styles.button}>View Revenue Flow</button>
                        </div>

                        <div className={styles.pricingCard}>
                          <div className={styles.pricingHeader}>
                            <span className={styles.pricingIcon}>⚡</span>
                            <h4 className={styles.pricingTitle}>Gasless Transactions</h4>
                          </div>
                          <p className={styles.pricingDescription}>
                            ERC-4337 smart account enables gasless operations with built-in paymaster support.
                          </p>
                          <div className={styles.pricingDetails}>
                            <span className={styles.pricingMetric}>✅ Zero gas fees for operations</span>
                            <span className={styles.pricingUnit}>✅ ERC-4337 account abstraction</span>
                          </div>
                          <button className={styles.button}>Configure Paymaster</button>
                        </div>

                        <div className={styles.pricingCard}>
                          <div className={styles.pricingHeader}>
                            <span className={styles.pricingIcon}>🔒</span>
                            <h4 className={styles.pricingTitle}>Policy Governance</h4>
                          </div>
                          <p className={styles.pricingDescription}>
                            Set spending limits and governance rules for your project wallet operations.
                          </p>
                          <div className={styles.pricingDetails}>
                            <span className={styles.pricingMetric}>✅ Project spending limits</span>
                            <span className={styles.pricingUnit}>✅ Whitelisted addresses</span>
                          </div>
                          <button className={styles.button}>Manage Policies</button>
                        </div>
                      </div>

                      {/* Project Financial Analytics */}
                      <div className={styles.statsGrid}>
                        {[
                          { title: 'Total Agents', value: '8', icon: '🤖', change: '+2 this month' },
                          { title: 'Total Revenue', value: '$12,831', icon: '💰', change: '+$1,234 this month' },
                          { title: 'Transactions', value: '1,047', icon: '⚡', change: '+234 this week' },
                          { title: 'Policy Status', value: 'Active', icon: '🛡️', change: 'Compliant' },
                          { title: 'Avg Agent Revenue', value: '$1,604', icon: '📈', change: '+18% growth' },
                          { title: 'Revenue Growth', value: '+23%', icon: '📊', change: 'Month over month' }
                        ].map((stat, index) => (
                          <div key={index} className={styles.statCard}>
                            <div className={styles.statHeader}>
                              <span className={styles.statIcon}>{stat.icon}</span>
                              <span className={styles.statChange}>{stat.change}</span>
                            </div>
                            <div className={styles.statValue}>{stat.value}</div>
                            <div className={styles.statTitle}>{stat.title}</div>
                          </div>
                        ))}
                      </div>

                      {/* Agent Revenue Breakdown */}
                      <div className={styles.card}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>Agent Revenue Breakdown</h3>
                          <div className={styles.tableFilters}>
                            <select className={styles.filterSelect}>
                              <option>All Agents</option>
                              <option>content-generator-v2</option>
                              <option>data-processor-alpha</option>
                              <option>recommendation-engine</option>
                            </select>
                            <select className={styles.filterSelect}>
                              <option>Last 30 days</option>
                              <option>Last 7 days</option>
                              <option>All time</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table className={styles.dataTable}>
                            <thead>
                              <tr>
                                <th>Agent ID</th>
                                <th>API Calls</th>
                                <th>Token Usage</th>
                                <th>Revenue Generated</th>
                                <th>Last Activity</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                {
                                  agentId: 'content-generator-v2',
                                  apiCalls: '2,847',
                                  tokenUsage: '1.2M',
                                  revenue: '$4,234.67',
                                  lastActivity: '2 minutes ago',
                                  status: 'Active'
                                },
                                {
                                  agentId: 'data-processor-alpha',
                                  apiCalls: '1,923',
                                  tokenUsage: '890K',
                                  revenue: '$3,156.89',
                                  lastActivity: '15 minutes ago',
                                  status: 'Active'
                                },
                                {
                                  agentId: 'recommendation-engine',
                                  apiCalls: '1,456',
                                  tokenUsage: '654K',
                                  revenue: '$2,789.12',
                                  lastActivity: '1 hour ago',
                                  status: 'Active'
                                },
                                {
                                  agentId: 'analytics-processor',
                                  apiCalls: '892',
                                  tokenUsage: '423K',
                                  revenue: '$1,567.34',
                                  lastActivity: '3 hours ago',
                                  status: 'Idle'
                                }
                              ].map((agent, index) => (
                                <tr key={agent.agentId}>
                                  <td className={styles.tableCellMono}>{agent.agentId}</td>
                                  <td className={styles.tableCellNumber}>{agent.apiCalls}</td>
                                  <td className={styles.tableCellNumber}>{agent.tokenUsage}</td>
                                  <td className={`${styles.tableCellNumber} ${styles.tableCellCurrency}`}>{agent.revenue}</td>
                                  <td className={styles.tableCellMono}>{agent.lastActivity}</td>
                                  <td>
                                    <span className={`${styles.badge} ${
                                      agent.status === 'Active' ? styles.badgeSuccess : styles.badgeWarning
                                    }`}>
                                      {agent.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={styles.card}>
                      <div className={styles.emptyState}>
                        Select a project to view its CDP wallet information
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
      billingRecords: state.project.billingRecords || [],
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
