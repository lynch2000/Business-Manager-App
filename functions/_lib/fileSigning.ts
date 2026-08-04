// Short-lived signed URLs for the private `receipts` bucket — the R2
// equivalent of Supabase Storage's createSignedUrl(). The signature covers
// the object key and an expiry timestamp so the URL is safe to use directly
// in <img src>, with no Authorization header available to attach.
function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toBase64Url(sig)
}

export async function signPath(secret: string, objectKey: string, expiresAt: number): Promise<string> {
  return hmac(secret, `${objectKey}:${expiresAt}`)
}

export async function verifyPathSignature(
  secret: string,
  objectKey: string,
  expiresAt: number,
  signature: string,
): Promise<boolean> {
  if (Date.now() / 1000 > expiresAt) return false
  const expected = await signPath(secret, objectKey, expiresAt)
  return expected === signature
}
