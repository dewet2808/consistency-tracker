import { useState } from 'react'
import { useAuth } from '../AuthContext'
import LogoMark from '../components/LogoMark'
import './Auth.css'

export default function Auth() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)

  function clearState() { setError(''); setMessage('') }

  async function handleSubmit(e) {
    e.preventDefault()
    clearState()
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)

    } else if (mode === 'signup') {
      if (password !== confirm) { setError('Passwords do not match'); setLoading(false); return }
      if (password.length < 8)  { setError('Password must be at least 8 characters'); setLoading(false); return }
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account, then log in.')

    } else if (mode === 'reset') {
      const { error } = await resetPassword(email)
      if (error) setError(error.message)
      else setMessage('Password reset link sent — check your email.')
    }

    setLoading(false)
  }

  function switchMode(m) { setMode(m); clearState(); setPassword(''); setConfirm('') }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><LogoMark size={44} /></div>
        <h1 className="auth-title">Daily</h1>
        <p className="auth-sub">
          {mode === 'login'  && 'Sign in to your account'}
          {mode === 'signup' && 'Create your free account'}
          {mode === 'reset'  && 'Reset your password'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          {mode !== 'reset' && (
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </div>
          )}

          {mode === 'signup' && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="••••••••" value={confirm}
                onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
          )}

          {error   && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button className="btn-primary auth-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : (
              mode === 'login'  ? 'Sign In' :
              mode === 'signup' ? 'Create Account' :
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button className="auth-link" onClick={() => switchMode('signup')}>No account? Sign up</button>
              <button className="auth-link muted" onClick={() => switchMode('reset')}>Forgot password?</button>
            </>
          )}
          {mode === 'signup' && (
            <button className="auth-link" onClick={() => switchMode('login')}>Already have an account? Sign in</button>
          )}
          {mode === 'reset' && (
            <button className="auth-link" onClick={() => switchMode('login')}>Back to sign in</button>
          )}
        </div>
      </div>
    </div>
  )
}
