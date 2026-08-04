// POST /api/files/sign — { bucket, paths, expiresIn? } -> signed URLs for
// the private `receipts` bucket. Mirrors Supabase Storage's
// createSignedUrl[s]() closely enough that the client shim can offer the
// same shape.
import type { Env } from '../../_lib/env'
import { requireUserId } from '../../_lib/auth'
import { json, error, HttpError } from '../../_lib/response'
import { signPath } from '../../_lib/fileSigning'

interface SignBody {
  bucket: string
  paths: string[]
  expiresIn?: number
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const userId = await requireUserId(request, env)
    const body = (await request.json()) as SignBody
    if (body.bucket !== 'receipts' && body.bucket !== 'logos') return error('Unknown bucket', 400)

    const expiresIn = body.expiresIn ?? 3600
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn

    const urls = await Promise.all(
      (body.paths ?? []).map(async (path) => {
        if (!path.startsWith(`${userId}/`)) return { path, signedUrl: null, error: 'Forbidden' }
        const objectKey = `${body.bucket}/${path}`
        const sig = await signPath(env.FILE_SIGNING_SECRET, objectKey, expiresAt)
        return { path, signedUrl: `/api/files/${body.bucket}/${path}?exp=${expiresAt}&sig=${sig}` }
      }),
    )

    return json(urls)
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    return error('Internal error', 500)
  }
}
