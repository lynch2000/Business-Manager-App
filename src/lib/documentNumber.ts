import { apiJson } from './api'

/** Atomically allocates the next quote/invoice number, e.g. "INV-0004". */
export async function nextDocumentNumber(type: 'quote' | 'invoice'): Promise<string | null> {
  const { data } = await apiJson<{ number: string }>('/api/next-document-number', {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
  return data?.number ?? null
}
