import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import styles from './style.css'

const Docs = () => {
  const [activeTab, setActiveTab] = useState('python-sdk')
  const [pythonReadme, setPythonReadme] = useState('')
  const [pythonApiDocs, setPythonApiDocs] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch Python SDK README and API Docs from GitHub
    const fetchPythonDocs = async () => {
      setLoading(true)
      try {
        const [readmeRes, apiDocsRes] = await Promise.all([
          fetch('https://raw.githubusercontent.com/Pagent-Money/agentmeter-sdk-python/main/README.md'),
          fetch('https://raw.githubusercontent.com/Pagent-Money/agentmeter-sdk-python/main/AgentMeter_API_Docs.md')
        ])
        const readmeText = await readmeRes.text()
        const apiDocsText = await apiDocsRes.text()
        setPythonReadme(readmeText)
        setPythonApiDocs(apiDocsText)
      } catch (error) {
        setPythonReadme('# Python SDK Documentation\n\nError loading documentation. Please visit our [GitHub repository](https://github.com/Pagent-Money/agentmeter-sdk-python) for the latest documentation.')
        setPythonApiDocs('')
      } finally {
        setLoading(false)
      }
    }
    fetchPythonDocs()
  }, [])

  const renderMarkdown = (text) => {
    // Simple markdown rendering for basic formatting
    return text
      .replace(/# (.*)/g, '<h1>$1</h1>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```python\n([\s\S]*?)\n```/g, '<pre class="language-python"><code>$1</code></pre>')
      .replace(/```bash\n([\s\S]*?)\n```/g, '<pre class="language-bash"><code>$1</code></pre>')
      .replace(/```\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className={styles.docs}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Documentation</h1>
          <p className={styles.subtitle}>
            Everything you need to integrate AgentMeter into your AI applications
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabNav}>
          <button
            className={classNames(styles.tab, { [styles.active]: activeTab === 'python-sdk' })}
            onClick={() => setActiveTab('python-sdk')}
          >
            Python SDK
          </button>
          <button
            className={classNames(styles.tab, { [styles.active]: activeTab === 'nodejs-sdk' })}
            onClick={() => setActiveTab('nodejs-sdk')}
          >
            Node.js SDK
          </button>
          <button
            className={classNames(styles.tab, { [styles.active]: activeTab === 'api-reference' })}
            onClick={() => setActiveTab('api-reference')}
          >
            API Reference
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {activeTab === 'python-sdk' && (
            <div className={styles.tabContent}>
              <div className={styles.sidebarLayout}>
                <div className={styles.sidebar}>
                  <h3>Quick Links</h3>
                  <ul>
                    <li><a href="#installation">Installation</a></li>
                    <li><a href="#quick-start">Quick Start</a></li>
                    <li><a href="#examples">Examples</a></li>
                    <li><a href="#api-reference">API Reference</a></li>
                  </ul>
                  <div className={styles.githubLink}>
                    <a 
                      href="https://github.com/Pagent-Money/agentmeter-sdk-python" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.button}
                    >
                      View on GitHub
                    </a>
                  </div>
                </div>

                <div className={styles.mainContent}>
                  {loading ? (
                    <div className={styles.loading}>
                      <div className={styles.spinner}></div>
                      <p>Loading documentation...</p>
                    </div>
                  ) : (
                    <div className={styles.markdown}>
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(pythonReadme) }} />
                      {pythonApiDocs && <>
                        <hr style={{ margin: '2rem 0' }} />
                        <h2 id="api-reference">Python SDK API Reference</h2>
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(pythonApiDocs) }} />
                      </>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nodejs-sdk' && (
            <div className={styles.tabContent}>
              <div className={styles.comingSoon}>
                <div className={styles.comingSoonIcon}>🚧</div>
                <h2>Node.js SDK Coming Soon</h2>
                <p>
                  We're working hard to bring you a comprehensive Node.js SDK for AgentMeter. 
                  In the meantime, you can use our REST API directly.
                </p>
                <div className={styles.comingSoonActions}>
                  <button 
                    className={styles.button}
                    onClick={() => setActiveTab('api-reference')}
                  >
                    View API Reference
                  </button>
                  <a 
                    href="https://github.com/Pagent-Money/agentmeter-sdk-nodejs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={classNames(styles.button, styles.buttonSecondary)}
                  >
                    Follow Progress on GitHub
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api-reference' && (
            <div className={styles.tabContent}>
              <div className={styles.apiReference}>
                <h2>REST API Reference</h2>
                <p>Complete reference for AgentMeter's REST API endpoints.</p>

                <div className={styles.apiSection}>
                  <h3>Authentication</h3>
                  <p>All API requests require authentication using your API key in the header:</p>
                  <pre className={styles.codeBlock}>
                    <code>{`Authorization: Bearer YOUR_API_KEY`}</code>
                  </pre>
                </div>

                <div className={styles.apiSection}>
                  <h3>Base URL</h3>
                  <pre className={styles.codeBlock}>
                    <code>https://api.staging.agentmeter.money</code>
                  </pre>
                </div>

                <div className={styles.apiSection}>
                  <h3>Endpoints</h3>
                  
                  <div className={styles.endpoint}>
                    <h4><span className={styles.method}>POST</span> /api/meter/event</h4>
                    <p>Record a metering event</p>
                    <pre className={styles.codeBlock}>
                      <code>{`{
  "project_id": "proj_12345678",
  "event_type": "api_call",
  "value": 1,
  "metadata": {
    "user_id": "user_123",
    "model": "gpt-4",
    "tokens": 150
  }
}`}</code>
                    </pre>
                  </div>

                  <div className={styles.endpoint}>
                    <h4><span className={styles.method}>GET</span> /api/meter/usage</h4>
                    <p>Get usage statistics for a project</p>
                    <pre className={styles.codeBlock}>
                      <code>{`{
  "project_id": "proj_12345678",
  "period": "month",
  "usage": {
    "api_calls": 1500,
    "total_tokens": 45000,
    "cost": 12.50
  }
}`}</code>
                    </pre>
                  </div>

                  <div className={styles.endpoint}>
                    <h4><span className={styles.method}>GET</span> /health</h4>
                    <p>Health check endpoint</p>
                    <pre className={styles.codeBlock}>
                      <code>{`{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00Z",
  "supabase": "connected",
  "environment": "production"
}`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Docs 