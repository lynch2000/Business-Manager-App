import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Field, Input, Spinner } from '../components/ui'
import { apiJson } from '../lib/api'
import logoWordmark from '../assets/logo-wordmark.png'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiJson<{ needsSetup: boolean }>('/api/auth/status').then(({ data }) => {
      setNeedsSetup(data?.needsSetup ?? false)
    })
  }, [])

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result = needsSetup ? await signUp(email, password) : await signIn(email, password)
    setBusy(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-brand-50/60 via-white to-white px-6">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img src={logoWordmark} alt="Lynch Heating & Cooling" className="h-14 w-auto" />
      </div>

      {needsSetup === null ? (
        <Spinner />
      ) : (
        <Card className="w-full max-w-sm rounded-3xl p-6">
          {needsSetup && (
            <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-700">
              First time here — set up your account to get started.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
              />
            </Field>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : needsSetup ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
