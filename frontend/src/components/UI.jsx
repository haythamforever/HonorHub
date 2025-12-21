import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// Integrant Brand Colors
const BRAND = {
  orange: '#F7941D',
  orangeHover: '#E8850A',
  cyan: '#00B8E6',
  cyanHover: '#0099C2',
}

// Button Component
export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  disabled = false,
  className = '',
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-[#F7941D] hover:bg-[#E8850A] text-white shadow-sm',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm',
    accent: 'bg-[#00B8E6] hover:bg-[#0099C2] text-white shadow-sm',
    ghost: 'hover:bg-gray-100 text-gray-600',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-5 py-2.5 text-lg',
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
})
Button.displayName = 'Button'

// Input Component
export const Input = forwardRef(({ 
  label, 
  error, 
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full px-3 py-2 rounded-lg bg-white border border-gray-300
          text-gray-900 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]
          transition-colors duration-150
          ${error ? 'border-rose-400 focus:ring-rose-400/30 focus:border-rose-400' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-rose-500">{error}</p>
      )}
    </div>
  )
})
Input.displayName = 'Input'

// Textarea Component
export const Textarea = forwardRef(({ 
  label, 
  error, 
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          w-full px-3 py-2 rounded-lg bg-white border border-gray-300
          text-gray-900 placeholder-gray-400 resize-none
          focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]
          transition-colors duration-150
          ${error ? 'border-rose-400 focus:ring-rose-400/30 focus:border-rose-400' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-rose-500">{error}</p>
      )}
    </div>
  )
})
Textarea.displayName = 'Textarea'

// Select Component
export const Select = forwardRef(({ 
  label, 
  error, 
  options = [],
  placeholder = 'Select...',
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full px-3 py-2 rounded-lg bg-white border border-gray-300
          text-gray-900 
          focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]
          transition-colors duration-150
          ${error ? 'border-rose-400 focus:ring-rose-400/30 focus:border-rose-400' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-rose-500">{error}</p>
      )}
    </div>
  )
})
Select.displayName = 'Select'

// Card Component
export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-xl p-6 border border-gray-200 shadow-sm
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

// Badge Component
export function Badge({ children, color = 'gray', className = '', style = {} }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    orange: 'bg-orange-100 text-[#F7941D]',
    cyan: 'bg-cyan-100 text-[#00B8E6]',
    emerald: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-700',
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
  }

  return (
    <span 
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${colors[color]} ${className}
      `}
      style={style}
    >
      {children}
    </span>
  )
}

// Modal Component
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full ${sizes[size]} bg-white rounded-xl p-6 shadow-xl`}
        >
          {title && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {children}
        </motion.div>
      </div>
    </div>
  )
}

// Empty State Component
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

// Loading Spinner
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={`spinner ${sizes[size]} ${className}`} />
  )
}

// Page Header
export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {title}
        </h1>
        {description && (
          <p className="text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}

// Stat Card
export function StatCard({ icon: Icon, label, value, trend, color = 'orange' }) {
  const colors = {
    orange: { bg: 'bg-orange-50', icon: 'bg-[#F7941D] text-white' },
    cyan: { bg: 'bg-cyan-50', icon: 'bg-[#00B8E6] text-white' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-500 text-white' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-500 text-white' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-500 text-white' },
  }

  const colorConfig = colors[color] || colors.orange

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-6 ${colorConfig.bg} border border-gray-100`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorConfig.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  )
}

// Pagination Component
export function Pagination({ 
  currentPage, 
  totalItems, 
  pageSize, 
  onPageChange, 
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200]
}) {
  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)
  
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }
  
  if (totalItems === 0) return null
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Page size selector */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00B8E6]/30 focus:border-[#00B8E6]"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span>entries</span>
      </div>
      
      {/* Info and navigation */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Showing {startItem} to {endItem} of {totalItems}
        </span>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-[#F7941D] text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          ))}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
