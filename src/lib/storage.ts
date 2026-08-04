import { apiFetch, apiJson } from './api'

type Bucket = 'logos' | 'receipts'

interface SignedUrlResult {
  path: string
  signedUrl: string | null
}

function bucketClient(bucket: Bucket) {
  return {
    async upload(path: string, body: Blob, opts?: { contentType?: string }) {
      const res = await apiFetch(`/api/files/${bucket}/${path}`, {
        method: 'PUT',
        body,
        headers: opts?.contentType ? { 'Content-Type': opts.contentType } : undefined,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        return { error: err as { error?: string } }
      }
      return { error: null }
    },

    async remove(paths: string[]) {
      await Promise.all(paths.map((p) => apiFetch(`/api/files/${bucket}/${p}`, { method: 'DELETE' })))
      return { error: null }
    },

    /** Matches supabase-js: synchronous, just builds a URL string. */
    getPublicUrl(path: string) {
      return { data: { publicUrl: `/api/files/${bucket}/${path}` } }
    },

    async createSignedUrl(path: string, expiresIn: number) {
      const { data, error } = await apiJson<SignedUrlResult[]>('/api/files/sign', {
        method: 'POST',
        body: JSON.stringify({ bucket, paths: [path], expiresIn }),
      })
      const signedUrl = data?.[0]?.signedUrl
      if (error || !signedUrl) return { data: null, error: error ?? { message: 'Failed to sign URL' } }
      return { data: { signedUrl }, error: null }
    },

    async createSignedUrls(paths: string[], expiresIn: number) {
      return apiJson<SignedUrlResult[]>('/api/files/sign', {
        method: 'POST',
        body: JSON.stringify({ bucket, paths, expiresIn }),
      })
    },
  }
}

export const storage = {
  from: bucketClient,
}
