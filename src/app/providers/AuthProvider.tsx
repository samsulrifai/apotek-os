import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api'
import type { User, LoginRequest, LoginResponse } from '@/types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = !!user

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      api.get<{ user: User }>('/auth/me')
        .then(res => setUser(res.user))
        .catch(() => {
          localStorage.removeItem('auth_token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await api.post<LoginResponse>('/auth/login', credentials)
      localStorage.setItem('auth_token', res.token)
      setUser(res.user)
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Gagal terhubung ke server'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {})
    localStorage.removeItem('auth_token')
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
