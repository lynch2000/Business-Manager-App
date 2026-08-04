// POST /api/next-document-number — { type: 'quote' | 'invoice' } -> { number }
// Atomically increments the counter on business_settings and returns a
// formatted number, replacing the old Postgres next_document_number() RPC.
// The UPDATE...RETURNING is a single statement so it can't race with itself.
import type { Env } from '../_lib/env'
import { requireUserId } from '../_lib/auth'
import { json, error, HttpError } from '../_lib/response'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const userId = await requireUserId(request, env)
    const body = (await request.json()) as { type?: string }
    if (body.type !== 'quote' && body.type !== 'invoice') return error('type must be "quote" or "invoice"', 400)

    const now = new Date().toISOString()
    await env.DB.prepare(
      `INSERT INTO business_settings (id, user_id, business_name, created_at, updated_at)
       SELECT ?, ?, '', ?, ? WHERE NOT EXISTS (SELECT 1 FROM business_settings WHERE user_id = ?)`,
    )
      .bind(crypto.randomUUID(), userId, now, now, userId)
      .run()

    const counterColumn = body.type === 'quote' ? 'next_quote_number' : 'next_invoice_number'
    const prefixColumn = body.type === 'quote' ? 'quote_prefix' : 'invoice_prefix'

    const row = await env.DB.prepare(
      `UPDATE business_settings SET ${counterColumn} = ${counterColumn} + 1, updated_at = ?
       WHERE user_id = ? RETURNING ${counterColumn} - 1 as number, ${prefixColumn} as prefix`,
    )
      .bind(now, userId)
      .first<{ number: number; prefix: string }>()

    if (!row) return error('Could not allocate a document number', 500)

    return json({ number: `${row.prefix}${String(row.number).padStart(4, '0')}` })
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    return error('Internal error', 500)
  }
}
