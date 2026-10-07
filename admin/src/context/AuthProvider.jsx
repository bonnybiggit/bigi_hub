import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext.js'
import { getSession, loginAdmin, logoutAdmin } from '../services/auth.service.js'
export default function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [expiresAt, setExpiresAt] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    getSession(controller.signal).then(result => { if (!controller.signal.aborted) { setAdmin(result.data.admin); setExpiresAt(result.data.expiresAt) } }).catch(failure => {
      if (!controller.signal.aborted && failure.status !== 401) setError('Unable to check your session. Please try again.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    const expire = () => setAdmin(null)
    window.addEventListener('admin-session-expired', expire)
    return () => { controller.abort(); window.removeEventListener('admin-session-expired', expire) }
  }, [revision])
  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setTimeout(() => setAdmin(null), Math.max(0, expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [expiresAt])
  async function login(email, password) {
    const result = await loginAdmin(email, password)
    setAdmin(result.data.admin)
    setExpiresAt(result.data.expiresAt)
    setError('')
  }
  async function logout() {
    try { await logoutAdmin() } catch (failure) { if (failure.status !== 401) throw failure }
    setAdmin(null)
  }
  function retry() { setError(''); setLoading(true); setRevision(value => value + 1) }
  return <AuthContext.Provider value={{ admin, loading, error, login, logout, retry }}>{children}</AuthContext.Provider>
}
