import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
export default function ProtectedRoute() {
  const { admin, loading, error, retry } = useAuth()
  const location = useLocation()
  if (loading) return <main className="auth-screen" role="status">Checking your session?</main>
  if (error) return <main className="auth-screen"><p role="alert">{error}</p><button type="button" onClick={retry}>Retry</button></main>
  return admin ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}
