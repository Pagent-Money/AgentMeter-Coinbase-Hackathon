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

const Dashboard = ({ actions }) => {
  const [activeTab, setActiveTab] = useState('projects')
  const [selectedProject, setSelectedProject] = useState('proj_123abc')
  const [showModal, setShowModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const projects = [
    { id: 'proj_123abc', name: 'AI Assistant Bot', created: '2024-01-15', status: 'Active' },
    { id: 'proj_456def', name: 'Content Generator', created: '2024-02-01', status: 'Active' },
    { id: 'proj_789ghi', name: 'Data Analyzer', created: '2024-02-10', status: 'Paused' }
  ]

  const meterEvents = [
    { id: 1, agent_id: 'assistant-v1', user_id: 'user_123', tokens_in: 150, tokens_out: 75, api_calls: 1, timestamp: '2024-02-15 14:30:22', request_cost: 0.001, token_cost: 0.005, total_cost: 0.006 },
    { id: 2, agent_id: 'content-gen-v2', user_id: 'user_456', tokens_in: 320, tokens_out: 180, api_calls: 1, timestamp: '2024-02-15 14:25:15', request_cost: 0.001, token_cost: 0.012, total_cost: 0.013 },
    { id: 3, agent_id: 'assistant-v1', user_id: 'user_789', tokens_in: 89, tokens_out: 45, api_calls: 1, timestamp: '2024-02-15 14:20:08', request_cost: 0.001, token_cost: 0.003, total_cost: 0.004 }
  ]

  const openModal = useCallback(() => {
    setShowModal(true)
    setNewProjectName('')
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setNewProjectName('')
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (newProjectName.trim()) {
      actions.createProject({ name: newProjectName.trim() })
      closeModal()
    }
  }, [newProjectName, actions, closeModal])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    } else if (e.key === 'Escape') {
      closeModal()
    }
  }, [handleSubmit, closeModal])

  return (
    <Fragment>
      <div className={styles.dashboard}>
        <div className={styles.container} style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>

          {/* Dashboard Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#1f2937' }}>Dashboard</h1>
            <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Manage your agents, track usage, and monitor revenue</p>
          </div>

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

                  {projects.map(project => (
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
                        <div>
                          <h4 style={{ fontWeight: '500', color: '#1f2937' }}>{project.name}</h4>
                          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>ID: {project.id}</p>
                          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Created: {project.created}</p>
                        </div>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          backgroundColor: project.status === 'Active' ? '#10b981' : '#f59e0b',
                          color: 'white'
                        }}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Project Details */}
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1.5rem' }}>Project Configuration</h3>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Project ID</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={selectedProject}
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
                      <button style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>📋</button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>Project Secret Key</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="password"
                        value="sk_live_abc123def456ghi789jkl012mno345pqr678stu901vwx234yzabc567def890"
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
                      <button style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>👁️</button>
                      <button style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>📋</button>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#ef4444', marginTop: '0.5rem' }}>⚠️ Keep this secret key secure. It provides full access to your project.</p>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '6px', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#1f2937' }}>SDK Integration Example</h4>
                    <pre style={{ fontSize: '0.8rem', color: '#374151', overflow: 'auto' }}>{`from agentmeter import AgentMeter

meter = AgentMeter(
    project_id="${selectedProject}",
    project_secret_key="sk_live_abc123...",
    agent_id="your-agent-id"
)`}</pre>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={styles.button} style={{ flex: 1, fontSize: '0.9rem' }}>🔄 Regenerate Keys</button>
                    <button className={classNames(styles.button, styles.buttonSecondary)} style={{ flex: 1, fontSize: '0.9rem' }}>⚙️ Settings</button>
                  </div>
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
                  { title: 'API Requests', subtitle: 'Request-based metering', value: '12,345', change: '+15%', icon: '🔄' },
                  { title: 'Input Tokens', subtitle: 'Token-based metering', value: '2.5M', change: '+22%', icon: '📥' },
                  { title: 'Output Tokens', subtitle: 'Token-based metering', value: '1.8M', change: '+18%', icon: '📤' },
                  { title: 'Request Revenue', subtitle: 'API-based billing', value: '$12.35', change: '+15%', icon: '💰' },
                  { title: 'Token Revenue', subtitle: 'Token-based billing', value: '$33.32', change: '+20%', icon: '💵' }
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
                  {['assistant-v1', 'content-gen-v2', 'data-analyzer-v1'].map((agent, index) => (
                    <div key={agent} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: index < 2 ? '1px solid #f3f4f6' : 'none' }}>
                      <span style={{ fontWeight: '500', color: '#374151' }}>{agent}</span>
                      <span style={{ color: '#6b7280' }}>{Math.floor(Math.random() * 1000) + 500} calls</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events List */}
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>Recent Metering Events</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                      <option>All Agents</option>
                      <option>assistant-v1</option>
                      <option>content-gen-v2</option>
                    </select>
                    <select style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                      <option>Last 24 hours</option>
                      <option>Last 7 days</option>
                      <option>Last 30 days</option>
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
                      {meterEvents.map(event => (
                        <tr key={event.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{event.agent_id}</td>
                          <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>{event.user_id}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>{event.api_calls}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>{event.tokens_in.toLocaleString()}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>{event.tokens_out.toLocaleString()}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#059669' }}>${event.request_cost.toFixed(3)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#dc2626' }}>${event.token_cost.toFixed(3)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>${event.total_cost.toFixed(3)}</td>
                          <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>{event.timestamp}</td>
                        </tr>
                      ))}
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
                  disabled={!newProjectName.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: newProjectName.trim() ? '#2563eb' : '#9ca3af',
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (newProjectName.trim()) {
                      e.target.style.backgroundColor = '#1d4ed8'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newProjectName.trim()) {
                      e.target.style.backgroundColor = '#2563eb'
                    }
                  }}
                >
                  Create Project
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

    }),
    dispatch => ({
      actions: bindActionCreators({
        ...projectActions
      }, dispatch)
    })
  )(Dashboard)
)
