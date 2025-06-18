import React, { useEffect, useState, useCallback, Fragment, useRef } from 'react'
import { Link } from 'react-router-dom'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { withRouter } from 'utils/withRouter'
import classNames from 'classnames'
import styles from './style.css'

const Chat = ({ actions }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `I understand you said: "${inputValue}". This is a simulated response. In a real implementation, this would be connected to your AI model.`,
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }, [inputValue, isLoading])

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        type: 'assistant',
        content: 'Chat cleared. How can I help you today?',
        timestamp: new Date().toLocaleTimeString()
      }
    ])
  }

  return (
    <Fragment>
      <div className={styles.chat}>
        <div className={styles.container}>
          {/* Chat Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>AI Chat Assistant</h1>
              <p className={styles.subtitle}>Powered by AgentMeter</p>
            </div>
            <div className={styles.headerRight}>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className={styles.modelSelect}
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="claude-3">Claude-3</option>
              </select>
              <button onClick={clearChat} className={styles.clearButton}>
                🗑️ Clear Chat
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className={styles.messagesContainer}>
            <div className={styles.messages}>
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={classNames(
                    styles.message,
                    message.type === 'user' ? styles.userMessage : styles.assistantMessage
                  )}
                >
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageAuthor}>
                        {message.type === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className={styles.messageTime}>{message.timestamp}</span>
                    </div>
                    <div className={styles.messageText}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className={classNames(styles.message, styles.assistantMessage)}>
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageAuthor}>AI Assistant</span>
                      <span className={styles.messageTime}>Typing...</span>
                    </div>
                    <div className={styles.typingIndicator}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Container */}
          <div className={styles.inputContainer}>
            <div className={styles.inputWrapper}>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                className={styles.input}
                rows={1}
                disabled={isLoading}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={classNames(styles.sendButton, {
                  [styles.sendButtonDisabled]: !inputValue.trim() || isLoading
                })}
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            <div className={styles.inputFooter}>
              <span className={styles.inputHint}>
                Press Enter to send • Shift+Enter for new line
              </span>
              <span className={styles.modelInfo}>
                Using: {selectedModel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default withRouter(
  connect(
    state => ({

    }),
    dispatch => ({
      actions: bindActionCreators({

      }, dispatch)
    })
  )(Chat)
) 