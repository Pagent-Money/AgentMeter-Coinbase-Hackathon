import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import classNames from 'classnames'
import styles from './style.css'
import { meterApi } from 'api'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Call the actual login API
      const response = await meterApi('POST', '/accounts/login', formData)
      
      if (response.success) {
        // Store auth state
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('userEmail', response.account.email)
        localStorage.setItem('sessionToken', response.session_token)
        localStorage.setItem('userFullName', response.account.full_name)
        localStorage.setItem('userCompany', response.account.company_name || '')
        
        navigate('/dashboard')
      } else {
        setErrors({
          form: response.error || 'Login failed. Please check your credentials.'
        })
      }
    } catch (error) {
      setErrors({
        form: error.message || 'Login failed. Please check your credentials.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.login}>
      <div className={styles.container}>
        <div className={styles.loginCard}>
          {/* Header */}
          <div className={styles.header}>
            <Link to="/" className={styles.logo}>
              <span className={styles.logoIcon}>⚡</span>
              <span className={styles.logoText}>AgentMeter</span>
            </Link>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>
              Sign in to your AgentMeter account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {errors.form && (
              <div className={styles.errorMessage}>
                {errors.form}
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={classNames(styles.input, {
                  [styles.inputError]: errors.email
                })}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <span className={styles.fieldError}>{errors.email}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={classNames(styles.input, {
                  [styles.inputError]: errors.password
                })}
                placeholder="Enter your password"
                disabled={loading}
              />
              {errors.password && (
                <span className={styles.fieldError}>{errors.password}</span>
              )}
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                <span className={styles.checkboxText}>Remember me</span>
              </label>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.loader}>Signing in...</span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className={styles.footer}>
            <p>
              Don't have an account?{' '}
              <Link to="/register" className={styles.signupLink}>
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Demo Account */}
          <div className={styles.demoSection}>
            <p className={styles.demoTitle}>Demo Account</p>
            <p className={styles.demoText}>
              Use <strong>demo@agentmeter.com</strong> with password <strong>demo123</strong> to try the platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login 