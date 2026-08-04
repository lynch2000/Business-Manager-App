// POST /api/send-email — sends quote/invoice PDFs and bank-detail emails via
// Resend. Ported from the old Supabase Deno edge function; same behavior.
import type { Env } from '../_lib/env'
import { requireUserId } from '../_lib/auth'
import { json, error, HttpError } from '../_lib/response'

interface SendEmailBody {
  to: string
  subject: string
  html: string
  attachment?: { filename: string; base64: string }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.RESEND_API_KEY) return error('RESEND_API_KEY is not configured.', 500)
    await requireUserId(request, env)

    const body = (await request.json()) as SendEmailBody
    if (!body.to || !body.subject || !body.html) return error('to, subject and html are required', 400)

    const payload: Record<string, unknown> = {
      from: env.FROM_EMAIL ?? 'onboarding@resend.dev',
      to: [body.to],
      subject: body.subject,
      html: body.html,
    }
    if (body.attachment) {
      payload.attachments = [{ filename: body.attachment.filename, content: body.attachment.base64 }]
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!resendRes.ok) return error(`Resend error: ${await resendRes.text()}`, 502)
    return json({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    return error('Internal error', 500)
  }
}
