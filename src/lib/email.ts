import { supabase } from './supabase'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  attachment?: { filename: string; base64: string }
}

/**
 * Sends via the `send-email` Supabase Edge Function (Resend). Throws if the
 * function isn't deployed/configured yet — callers should fall back to a
 * mailto: link so the app is usable before that setup is done.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { error } = await supabase.functions.invoke('send-email', { body: input })
  if (error) throw error
}

export function buildMailto(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
