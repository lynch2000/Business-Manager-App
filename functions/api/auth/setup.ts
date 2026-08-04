// POST /api/auth/setup — creates the one business-owner account. Only works
// while no user exists yet, so it's safe to leave reachable on the public
// internet: after the first successful call it permanently refuses.
import type { Env } from '../../_lib/env'
import { hashPassword, signToken } from '../../_lib/auth'
import { json, error } from '../../_lib/response'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const existing = await env.DB.prepare('SELECT id FROM users LIMIT 1').first()
  if (existing) return error('This app is already set up. Please sign in instead.', 403)

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password
  if (!email || !password || password.length < 6) {
    return error('A valid email and a password of at least 6 characters are required.', 400)
  }

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString()

  await env.DB.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .bind(id, email, passwordHash, now)
    .run()

  await env.DB.prepare(
    'INSERT INTO business_settings (id, user_id, business_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(crypto.randomUUID(), id, 'Lynch Heating & Cooling', now, now)
    .run()

  const token = await signToken(id, env)
  return json({ token, user: { id, email } })
}
