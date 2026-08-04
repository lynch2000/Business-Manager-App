import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { Button, Field, Input } from '../components/ui'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
    } else if (mode === 'signUp') {
      setInfo('Account created. Check your email to confirm, then sign in.')
      setMode('signIn')
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-16 w-16 rounded-2xl shadow" />
        <h1 className="text-lg font-semibold text-slate-900">HVAC Business Manager</h1>
      </div>

      {!isSupabaseConfigured && (
        <div className="mb-4 w-full max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env.local</code> file — see README.md.
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-600">{info}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {mode === 'signIn' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <button
        className="mt-4 text-sm text-brand-600"
        onClick={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn')
          setError(null)
          setInfo(null)
        }}
      >
        {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
