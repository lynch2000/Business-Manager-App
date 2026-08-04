// Supabase Edge Function: send-email
// Sends quote/invoice PDFs and bank-detail emails via Resend on behalf of
// the signed-in business owner. Deploy with:
//   supabase functions deploy send-email
// and set secrets:
//   supabase secrets set RESEND_API_KEY=... FROM_EMAIL="Your Business <billing@yourdomain.com>"

import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'onboarding@resend.dev'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendEmailBody {
  to: string
  subject: string
  html: string
  attachment?: { filename: string; base64: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY is not configured on this function.' }, 500)
    }

    // Require a valid signed-in user — this function must not be an open relay.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not authenticated' }, 401)

    const body: SendEmailBody = await req.json()
    if (!body.to || !body.subject || !body.html) {
      return json({ error: 'to, subject and html are required' }, 400)
    }

    const payload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [body.to],
      subject: body.subject,
      html: body.html,
    }

    if (body.attachment) {
      payload.attachments = [{ filename: body.attachment.filename, content: body.attachment.base64 }]
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      return json({ error: `Resend error: ${errText}` }, 502)
    }

    return json({ ok: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
