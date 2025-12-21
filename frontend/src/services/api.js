import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Track if we're already handling a 401 to prevent multiple redirects/toasts
let isRedirecting = false

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred'
    const status = error.response?.status
    
    // Handle 401 (unauthorized) or 403 (forbidden/expired token)
    if (status === 401 || status === 403) {
      // Only handle once to prevent multiple toasts/redirects
      if (!isRedirecting) {
        isRedirecting = true
        
        // Clear auth data
        localStorage.removeItem('honorhub-auth')
        delete api.defaults.headers.common['Authorization']
        
        // Show single toast
        toast.error('Session expired. Please log in again.', {
          id: 'session-expired', // Use ID to prevent duplicate toasts
          duration: 4000,
        })
        
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
      
      return Promise.reject(error)
    }
    
    // Show error toast for other errors
    toast.error(message)
    
    return Promise.reject(error)
  }
)

// Reset redirect flag when navigating (for when user logs in again)
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    isRedirecting = false
  })
}

// Function to reset the redirect flag (call after successful login)
export const resetAuthRedirect = () => {
  isRedirecting = false
}

export default api

// API helper functions
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/password', data),
  checkSignupAllowed: () => api.get('/auth/signup-allowed'),
}

export const employeesAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  bulkCreate: (employees) => api.post('/employees/bulk', { employees }),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getDepartments: () => api.get('/employees/meta/departments'),
  getAccounts: () => api.get('/employees/meta/accounts'),
  
  // Employee assignment endpoints
  getAssignments: (userId) => api.get(`/employees/assignments/user/${userId}`),
  addAssignments: (userId, employeeIds) => 
    api.post(`/employees/assignments/user/${userId}`, { employee_ids: employeeIds }),
  removeAssignments: (userId, employeeIds) => 
    api.delete(`/employees/assignments/user/${userId}`, { data: { employee_ids: employeeIds } }),
  updateAssignments: (userId, employeeIds) => 
    api.put(`/employees/assignments/user/${userId}`, { employee_ids: employeeIds }),
  assignByAccount: (userId, accounts) => 
    api.post(`/employees/assignments/user/${userId}/by-account`, { accounts }),
}

export const tiersAPI = {
  getAll: () => api.get('/tiers'),
  getById: (id) => api.get(`/tiers/${id}`),
  create: (data) => api.post('/tiers', data),
  update: (id, data) => api.put(`/tiers/${id}`, data),
  reorder: (tiers) => api.put('/tiers/reorder/all', { tiers }),
  delete: (id) => api.delete(`/tiers/${id}`),
}

export const templatesAPI = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
}

export const certificatesAPI = {
  getAll: (params) => api.get('/certificates', { params }),
  getById: (id) => api.get(`/certificates/${id}`),
  create: (data) => api.post('/certificates', data),
  bulkCreate: (data) => api.post('/certificates/bulk', data),
  resend: (id) => api.post(`/certificates/${id}/resend`),
  delete: (id) => api.delete(`/certificates/${id}`),
  getStats: () => api.get('/certificates/stats/overview'),
}

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (settings) => api.put('/settings', { settings }),
  testEmail: (testEmail) => api.post('/settings/test-email', { testEmail }),
}

export const uploadAPI = {
  uploadLogo: (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post('/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadSignature: (file) => {
    const formData = new FormData()
    formData.append('signature', file)
    return api.post('/upload/signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadEmployeesCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/employees-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteFile: (type, filename) => api.delete(`/upload/${type}/${filename}`),
}

export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}

export const reportsAPI = {
  getEmployeeRecognitions: (params) => api.get('/reports/employee-recognitions', { params }),
  getEmployeeDetail: (employeeId) => api.get(`/reports/employee-recognitions/${employeeId}`),
  getSummary: (params) => api.get('/reports/summary', { params }),
  getFilters: () => api.get('/reports/filters'),
}
