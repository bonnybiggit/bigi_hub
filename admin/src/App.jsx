import { Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Listings from './pages/Listings.jsx'
import Jobs from './pages/Jobs.jsx'
import AIPostAssistant from './pages/AIPostAssistant.jsx'
import NotFound from './pages/NotFound.jsx'
import Login from './pages/Login.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import Profile from './pages/Profile.jsx'
import { adminSections } from './utils/navigation.js'
export default function App() {
  return <AuthProvider><Routes><Route path="login" element={<Login />} /><Route element={<ProtectedRoute />}><Route element={<AdminLayout />}>
    <Route index element={<Dashboard />} />
    <Route path="ai-post-assistant" element={<AIPostAssistant />} />
    {adminSections.map(title => <Route key={title} path={title.toLowerCase()} element={title === 'Jobs' ? <Jobs /> : <Listings title={title} />} />)}
    <Route path="profile" element={<Profile />} />
    <Route path="*" element={<NotFound />} />
  </Route></Route></Routes></AuthProvider>
}
