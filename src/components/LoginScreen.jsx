import { useState } from 'react'
import { ApiError } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'
import { Spinner } from './Spinner.jsx'

export function LoginScreen() {
  const { login, sessionExpired } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = {}
    if (email.trim() === '') {
      errors.email = 'Enter your email address.'
    }
    if (password === '') {
      errors.password = 'Enter your password.'
    }

    setFieldErrors(errors)
    setFormError(null)

    if (Object.keys(errors).length > 0) {
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setFormError('Incorrect email or password.')
      } else if (caught instanceof ApiError && caught.fieldErrors) {
        setFieldErrors(caught.fieldErrors)
      } else {
        setFormError(caught?.message ?? 'Unable to sign in right now.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-card">
        <h1>Job Application Tracker</h1>
        <p className="login-intro">Sign in to review and update your applications.</p>

        {sessionExpired ? (
          <p className="alert alert-info" role="status">
            Your session ended. Sign in again to continue.
          </p>
        ) : null}

        {formError ? (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fieldErrors.email ? 'true' : undefined}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {fieldErrors.email ? (
              <p className="field-error" id="login-email-error">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={fieldErrors.password ? 'true' : undefined}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            {fieldErrors.password ? (
              <p className="field-error" id="login-password-error">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <button type="submit" className="button button-primary button-block" disabled={submitting}>
            {submitting ? <Spinner label="Signing in" /> : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
