import { supabase } from './supabase'
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
 * Sends a receipt photo to the `parse-receipt` edge function for automatic
 * field extraction. Throws if the function isn't deployed/configured —
 * callers should fall back to a blank, manually-filled form.
 */
export async function scanReceipt(base64: string, mimeType: string): Promise<ScannedReceipt> {
  const { data, error } = await supabase.functions.invoke('parse-receipt', { body: { imageBase64: base64, mimeType } })
  if (error) throw error
  return data as ScannedReceipt
}
