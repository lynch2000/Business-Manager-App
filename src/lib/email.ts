import { apiFetch } from './api'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  attachment?: { filename: string; base64: string }
}

/**
 * Sends via the `/api/send-email` Pages Function (Resend). Throws if the
 * function isn't configured yet — callers should fall back to a mailto:
 * link so the app is usable before that setup is done.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const res = await apiFetch('/api/send-email', { method: 'POST', body: JSON.stringify(input) })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((body as { error?: string }).error ?? 'Failed to send email')
  }
}

export function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
