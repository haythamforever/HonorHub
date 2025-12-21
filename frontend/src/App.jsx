import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Certificates from './pages/Certificates'
import SendCertificate from './pages/SendCertificate'
import BulkSend from './pages/BulkSend'
import Templates from './pages/Templates'
import Tiers from './pages/Tiers'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import Users from './pages/Users'
import Reports from './pages/Reports'

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12"></div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/certificates" element={<Certificates />} />
                <Route path="/send" element={<SendCertificate />} />
                <Route path="/bulk-send" element={<BulkSend />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/tiers" element={<Tiers />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<Users />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

