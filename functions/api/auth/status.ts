// GET /api/auth/status — tells the Login page whether this is a fresh
// deployment (show the one-time "set up your account" form) or already
// has an owner (show the normal sign-in form).
import type { Env } from '../../_lib/env'
import { json } from '../../_lib/response'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const existing = await env.DB.prepare('SELECT id FROM users LIMIT 1').first()
  return json({ needsSetup: !existing })
}
