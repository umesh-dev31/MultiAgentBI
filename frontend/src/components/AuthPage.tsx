import { useState, type FormEvent } from 'react'
import { LogoWithWordmark } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { AuthError, submitAuth } from '../auth'
import './AuthPage.css'

type Field = 'username' | 'email' | 'identifier' | 'password'

export function AuthPage({ mode, returnTo }: { mode: 'login' | 'signup'; returnTo: string }) {
  const signup = mode === 'signup'
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('')

  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setStatus('')
    const form = event.currentTarget
    const values = new FormData(form)
    const read = (name: Field) => String(values.get(name) ?? '')
    const next: typeof errors = {}
    const passwordLength = Array.from(read('password')).length
    if (signup) {
      if (!/^[A-Za-z][A-Za-z0-9_]{2,29}$/.test(read('username').trim())) {
        next.username = 'Use 3–30 letters, numbers, or underscores. Start with a letter.'
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(read('email').trim())) {
        next.email = 'Enter a valid email address.'
      }
      if (passwordLength < 8) next.password = 'Use at least 8 characters.'
    } else {
      if (!read('identifier').trim()) next.identifier = 'Enter your username or email.'
      if (!read('password')) next.password = 'Enter your password.'
    }
    if (passwordLength > 128) next.password = 'Use no more than 128 characters.'
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) {
      const input = form.elements.namedItem(first)
      if (input instanceof HTMLInputElement) input.focus()
      return
    }
    setSubmitting(true)
    try {
      const password = read('password')
      await submitAuth(mode, signup
        ? { username: read('username').trim(), email: read('email').trim(), password }
        : { identifier: read('identifier').trim(), password })
      window.location.replace(returnTo)
    } catch (error) {
      if (error instanceof AuthError && (error.field === 'email' || error.field === 'username' || error.field === 'password' || error.field === 'identifier')) {
        setErrors({ [error.field]: error.message })
        const input = form.elements.namedItem(error.field)
        if (input instanceof HTMLInputElement) input.focus()
      } else {
        setStatus(error instanceof AuthError ? error.message : 'Could not connect. Please try again.')
      }
      setSubmitting(false)
    }
  }

  function field(name: Field, label: string, type: string, autoComplete: string) {
    const error = errors[name]
    return (
      <div className="auth-field">
        <label htmlFor={name}>{label}</label>
        <div className={name === 'password' ? 'auth-password' : undefined}>
          <input id={name} name={name} type={type} autoComplete={autoComplete} required
            spellCheck={false} autoCapitalize="none" aria-invalid={Boolean(error)}
            aria-describedby={error ? name + '-error' : undefined} />
          {name === 'password' && (
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? 'Hide' : 'Show'} password
            </button>
          )}
        </div>
        {error && <p className="auth-error" id={name + '-error'} role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <a href="/" aria-label="AgentInsight AI home"><LogoWithWordmark /></a>
        <ThemeToggle />
      </header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="auth-title">
          <a className="auth-back" href="/">&larr; Back to home</a>
          <h1 id="auth-title">{signup ? 'Create your account' : 'Log in'}</h1>
          <p className="auth-description">{signup ? 'Set up your personal analytics workspace.' : 'Continue to your analytics workspace.'}</p>
          <form noValidate onSubmit={submit} aria-busy={submitting} onChange={() => { if (status) setStatus('') }}>
            {signup ? (
              <>
                {field('username', 'Username', 'text', 'username')}
                {field('email', 'Email address', 'email', 'email')}
              </>
            ) : field('identifier', 'Username or email', 'text', 'username')}
            {field('password', 'Password', showPassword ? 'text' : 'password', signup ? 'new-password' : 'current-password')}
            <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? (signup ? 'Creating account…' : 'Logging in…') : signup ? 'Create account' : 'Log in'}</button>
            <p className="auth-status" role="alert">{status}</p>
          </form>
          <p className="auth-switch">
            {signup ? 'Already have an account? ' : 'New to AgentInsight? '}
            <a href={(signup ? '/login' : '/signup') + new URL(returnTo, window.location.origin).search}>{signup ? 'Log in' : 'Sign up'}</a>
          </p>
        </section>
      </main>
    </div>
  )
}
