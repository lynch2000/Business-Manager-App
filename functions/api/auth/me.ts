import type { Env } from '../../_lib/env'
import { requireUserId } from '../../_lib/auth'
import { json, error, HttpError } from '../../_lib/response'

interface UserRow {
  id: string
  email: string
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const userId = await requireUserId(request, env)
    const user = await env.DB.prepare('SELECT id, email FROM users WHERE id = ?').bind(userId).first<UserRow>()
    if (!user) return error('Not authenticated', 401)
    return json({ user })
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    throw err
  }
}
