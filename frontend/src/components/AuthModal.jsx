import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthModal({ mode, onClose, onSwitchMode }) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        onClose()
      } else {
        const session = await signUp(email, password)
        if (session) {
          // Email confirmation disabled — signed in immediately
          onClose()
        } else {
          setInfo('Account created! Check your email to confirm, then sign in.')
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {info  && <div className="alert alert-success">{info}</div>}

          <div className="form-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="modal-footer">
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button className="link-btn" onClick={() => onSwitchMode('register')}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button className="link-btn" onClick={() => onSwitchMode('login')}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
