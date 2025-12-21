import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  Send, 
  Layers,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  BarChart3
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import logoImg from '../assets/logo.png'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/employees', icon: Users, label: 'Employees' },
  { path: '/certificates', icon: Award, label: 'Certificates' },
  { path: '/send', icon: Send, label: 'Send Certificate' },
  { path: '/bulk-send', icon: Sparkles, label: 'Bulk Send' },
  { path: '/templates', icon: Layers, label: 'Templates' },
  { path: '/tiers', icon: Trophy, label: 'Performance Tiers' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/users', icon: ShieldCheck, label: 'User Management', adminOnly: true },
  { path: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
]

function NavItem({ item, collapsed, onClick }) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150 group ${
          isActive
            ? 'bg-[#F7941D] text-white'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon 
            className={`w-5 h-5 flex-shrink-0 ${
              isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
            }`} 
          />
          {!collapsed && (
            <span className="font-medium">{item.label}</span>
          )}
          {!collapsed && isActive && (
            <ChevronRight className="w-4 h-4 ml-auto text-white/80" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex-1 flex items-center justify-center">
              <img 
                src={logoImg} 
                alt="HonorHub" 
                className={`${collapsed ? 'h-10' : 'h-[80px]'} w-auto object-contain max-w-full`} 
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems
              .filter(item => !item.adminOnly || user?.role === 'admin')
              .map((item) => (
                <NavItem 
                  key={item.path} 
                  item={item} 
                  collapsed={collapsed}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-gray-200">
            <NavLink
              to="/profile"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors mb-2"
            >
              <div className="w-9 h-9 rounded-full bg-[#00B8E6] flex items-center justify-center text-white font-medium text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              )}
            </NavLink>
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="w-5 h-5" />
              {!collapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>

          {/* Collapse Toggle (Desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#F7941D]" />
            <span className="font-bold">
              <span className="text-[#F7941D]">Honor</span>
              <span className="text-[#00B8E6]">Hub</span>
            </span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
