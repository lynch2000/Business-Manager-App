import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiJson, getToken, setToken } from '../lib/api'

export interface AppUser {
  id: string
  email: string
}

interface AuthContextValue {
  session: { user: AppUser } | null
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restore() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      const { data, error } = await apiJson<{ user: AppUser }>('/api/auth/me')
      if (!error && data) setUser(data.user)
      else setToken(null)
      setLoading(false)
    }
    restore()
  }, [])

  async function signIn(email: string, password: string) {
    const { data, error } = await apiJson<{ token: string; user: AppUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (error || !data) return { error: error?.message ?? 'Sign in failed' }
    setToken(data.token)
    setUser(data.user)
    return { error: null }
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await apiJson<{ token: string; user: AppUser }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (error || !data) return { error: error?.message ?? 'Setup failed' }
    setToken(data.token)
    setUser(data.user)
    return { error: null }
  }

  async function signOut() {
    setToken(null)
    setUser(null)
  }

  const session = user ? { user } : null

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
