// Supabase Edge Function: parse-receipt
// Reads a photographed receipt/docket/invoice using Claude's vision and
// returns structured fields to pre-fill an expense entry. Deploy with:
//   supabase functions deploy parse-receipt
// and set the secret:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CATEGORIES = [
  'Materials & Parts', 'Fuel & Travel', 'Tools & Equipment', 'Subcontractors',
  'Vehicle', 'Insurance', 'Office & Admin', 'Training', 'Other',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParseReceiptBody {
  imageBase64: string
  mimeType: string
}

const SYSTEM_PROMPT = `You read photos of receipts, dockets and supplier invoices for a small \
heating & air conditioning business and extract expense details. Respond with ONLY a single \
JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "vendor": string | null,
  "expense_date": string | null,  // ISO date YYYY-MM-DD, the date on the receipt
  "amount": number | null,        // the total amount paid, including any VAT/tax
  "vat_amount": number | null,    // the VAT/tax amount if shown separately, else null
  "category": string | null,      // one of: ${CATEGORIES.join(', ')}
  "description": string | null    // a short (few words) summary of what was purchased
}
If a field can't be read from the image, use null for it. Never guess a number you can't see.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!ANTHROPIC_API_KEY) {
      return json({ error: 'ANTHROPIC_API_KEY is not configured on this function.' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not authenticated' }, 401)

    const body: ParseReceiptBody = await req.json()
    if (!body.imageBase64 || !body.mimeType) {
      return json({ error: 'imageBase64 and mimeType are required' }, 400)
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: body.mimeType, data: body.imageBase64 } },
              { type: 'text', text: 'Extract the expense details from this receipt as JSON.' },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return json({ error: `Claude API error: ${errText}` }, 502)
    }

    const result = await anthropicRes.json()
    const text: string = result.content?.[0]?.text ?? '{}'

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : {}
    }

    const category = typeof parsed.category === 'string' && CATEGORIES.includes(parsed.category)
      ? parsed.category
      : null

    return json({
      vendor: typeof parsed.vendor === 'string' ? parsed.vendor : null,
      expense_date: typeof parsed.expense_date === 'string' ? parsed.expense_date : null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      vat_amount: typeof parsed.vat_amount === 'number' ? parsed.vat_amount : null,
      category,
      description: typeof parsed.description === 'string' ? parsed.description : null,
    })
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
