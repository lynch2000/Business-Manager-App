import { apiFetch } from './api'
import type { ExpenseCategory } from '../types'

export interface ScannedReceipt {
  vendor: string | null
  expense_date: string | null
  amount: number | null
  vat_amount: number | null
  category: ExpenseCategory | null
  description: string | null
}

/**
 * Sends a receipt photo to the `/api/parse-receipt` Pages Function for
 * automatic field extraction. Throws if it isn't configured — callers
 * should fall back to a blank, manually-filled form.
 */
export async function scanReceipt(base64: string, mimeType: string): Promise<ScannedReceipt> {
  const res = await apiFetch('/api/parse-receipt', {
    method: 'POST',
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error((body as { error?: string })?.error ?? 'Failed to scan receipt')
  return body as ScannedReceipt
}
