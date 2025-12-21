import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api, { resetAuthRedirect } from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password })
        const { token, user } = response.data
        
        // Reset the redirect flag on successful login
        resetAuthRedirect()
        
        set({ 
          token, 
          user, 
          isAuthenticated: true,
          isLoading: false 
        })
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        return user
      },

      register: async (data) => {
        const response = await api.post('/auth/register', data)
        const { token, user } = response.data
        
        // Reset the redirect flag on successful register
        resetAuthRedirect()
        
        set({ 
          token, 
          user, 
          isAuthenticated: true,
          isLoading: false 
        })
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        return user
      },

      logout: () => {
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false,
          isLoading: false 
        })
        
        delete api.defaults.headers.common['Authorization']
        
        // Clear persisted storage
        localStorage.removeItem('honorhub-auth')
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData }
        }))
      },

      initAuth: () => {
        const state = get()
        if (state.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
          set({ isLoading: false })
        } else {
          set({ isLoading: false, isAuthenticated: false })
        }
      },

      // Called when token expires (from API interceptor)
      clearAuth: () => {
        set({ 
          token: null, 
          user: null, 
          isAuthenticated: false,
          isLoading: false 
        })
        delete api.defaults.headers.common['Authorization']
      },
    }),
    {
      name: 'honorhub-auth',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initAuth()
        }
      },
    }
  )
)
