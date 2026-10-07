import { Outlet } from 'react-router-dom'
import AdminUIProvider from '../context/AdminUIProvider.jsx'
import AdminHeader from '../components/AdminHeader.jsx'
import AdminNavigation from '../components/AdminNavigation.jsx'
export default function AdminLayout() {
  return <AdminUIProvider><div className="admin-shell">
    <a className="skip-link" href="#admin-content">Skip to content</a>
    <AdminHeader /><AdminNavigation />
    <main id="admin-content" className="admin-content" tabIndex={-1}><Outlet /></main>
  </div></AdminUIProvider>
}
