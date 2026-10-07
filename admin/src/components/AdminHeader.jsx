import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAdminUI } from '../hooks/useAdminUI.js'
import { useAuth } from '../hooks/useAuth.js'
export default function AdminHeader() {
  const { menuOpen, setMenuOpen } = useAdminUI()
  const { admin, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setBusy(true); setError('')
    try { await logout() } catch { setError('Logout failed. Please try again.'); setBusy(false) }
  }
  return <header className="admin-header"><Link className="admin-brand" to="/" onClick={() => setMenuOpen(false)}>Bigi_Hub <span>Admin</span></Link>
    <div className="header-actions"><button className="menu-toggle" type="button" aria-controls="admin-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close menu' : 'Menu'}</button>
      <Link className="admin-profile-link" to="/profile" onClick={() => setMenuOpen(false)}><span className="profile-avatar" aria-hidden="true">{admin.email[0].toUpperCase()}</span><span><span className="profile-link-label">Admin profile</span><span className="profile-link-email">{admin.email}</span></span></Link>
      <button className="logout-button" type="button" onClick={signOut} disabled={busy}>{busy ? 'Signing out...' : 'Logout'}</button>
    </div>{error && <p className="logout-error" role="alert">{error}</p>}
  </header>
}
