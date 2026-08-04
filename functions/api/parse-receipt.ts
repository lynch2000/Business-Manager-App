// POST /api/parse-receipt — reads a photographed receipt/docket/invoice
// using Claude's vision and returns structured fields to pre-fill an
// expense/creditor entry. Ported from the old Supabase Deno edge function.
import type { Env } from '../_lib/env'
import { requireUserId } from '../_lib/auth'
import { json, error, HttpError } from '../_lib/response'

const CATEGORIES = [
  'Materials & Parts', 'Fuel & Travel', 'Tools & Equipment', 'Subcontractors',
  'Vehicle', 'Insurance', 'Office & Admin', 'Training', 'Other',
]

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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.ANTHROPIC_API_KEY) return error('ANTHROPIC_API_KEY is not configured.', 500)
    await requireUserId(request, env)

    const body = (await request.json()) as ParseReceiptBody
    if (!body.imageBase64 || !body.mimeType) return error('imageBase64 and mimeType are required', 400)

    const isPdf = body.mimeType === 'application/pdf'
    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: body.imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: body.mimeType, data: body.imageBase64 } }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
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
            content: [fileBlock, { type: 'text', text: 'Extract the expense details from this receipt as JSON.' }],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) return error(`Claude API error: ${await anthropicRes.text()}`, 502)

    const result = (await anthropicRes.json()) as { content?: Array<{ text?: string }> }
    const text = result.content?.[0]?.text ?? '{}'

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : {}
    }

    const category = typeof parsed.category === 'string' && CATEGORIES.includes(parsed.category) ? parsed.category : null

    return json({
      vendor: typeof parsed.vendor === 'string' ? parsed.vendor : null,
      expense_date: typeof parsed.expense_date === 'string' ? parsed.expense_date : null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      vat_amount: typeof parsed.vat_amount === 'number' ? parsed.vat_amount : null,
      category,
      description: typeof parsed.description === 'string' ? parsed.description : null,
    })
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    return error('Internal error', 500)
  }
}
