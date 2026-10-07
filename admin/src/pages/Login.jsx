import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
export default function Login() {
  usePageTitle('Login')
  const { admin, loading, error: sessionError, retry, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const target = location.state?.from
  const destination = typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && target !== '/login' ? target : '/'
  async function submit(event) {
    event.preventDefault()
    setError(''); setBusy(true)
    try { await login(email.trim(), password) } catch (failure) { setError(failure.message || 'Unable to sign in. Please try again.') } finally { setBusy(false); setPassword('') }
  }
  if (loading) return <main className="auth-screen" role="status">Checking your session?</main>
  if (admin) return <Navigate to={destination} replace />
  return <main className="auth-screen"><section className="panel login-panel"><h1>Admin login</h1><p>Sign in to Bigi_Hub Admin.</p>
    {sessionError ? <><p role="alert">{sessionError}</p><button type="button" onClick={retry}>Retry session check</button></> : <form onSubmit={submit}>
      <label htmlFor="admin-email">Email</label><input id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
      <label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
      {error && <p role="alert">{error}</p>}<button className="auth-button" type="submit" disabled={busy}>{busy ? 'Signing in?' : 'Sign in'}</button>
    </form>}
  </section></main>
}
