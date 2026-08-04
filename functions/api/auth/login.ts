import type { Env } from '../../_lib/env'
import { verifyPassword, signToken } from '../../_lib/auth'
import { json, error } from '../../_lib/response'

interface UserRow {
  id: string
  email: string
  password_hash: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password
  if (!email || !password) return error('Email and password are required.', 400)

  const user = await env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<UserRow>()

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return error('Invalid email or password.', 401)
  }

  const token = await signToken(user.id, env)
  return json({ token, user: { id: user.id, email: user.email } })
}
