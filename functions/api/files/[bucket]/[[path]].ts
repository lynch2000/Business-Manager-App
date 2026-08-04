import type { Env } from '../../../_lib/env'
import { requireUserId } from '../../../_lib/auth'
import { error, HttpError } from '../../../_lib/response'
import { verifyPathSignature } from '../../../_lib/fileSigning'

function pathParam(params: Record<string, unknown>): string {
  const p = params.path
  return Array.isArray(p) ? p.join('/') : String(p ?? '')
}

function validBucket(bucket: string): bucket is 'logos' | 'receipts' {
  return bucket === 'logos' || bucket === 'receipts'
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const bucket = params.bucket as string
  const path = pathParam(params)
  if (!validBucket(bucket) || !path) return error('Not found', 404)

  const objectKey = `${bucket}/${path}`

  if (bucket === 'receipts') {
    const url = new URL(request.url)
    const exp = Number(url.searchParams.get('exp'))
    const sig = url.searchParams.get('sig') ?? ''
    const valid = exp && sig && (await verifyPathSignature(env.FILE_SIGNING_SECRET, objectKey, exp, sig))
    if (!valid) return error('Link expired or invalid', 403)
  }

  const object = await env.FILES.get(objectKey)
  if (!object) return error('Not found', 404)

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': bucket === 'logos' ? 'public, max-age=3600' : 'private, max-age=60',
    },
  })
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const bucket = params.bucket as string
    const path = pathParam(params)
    if (!validBucket(bucket) || !path) return error('Not found', 404)

    const userId = await requireUserId(request, env)
    if (!path.startsWith(`${userId}/`)) return error('Forbidden', 403)

    const contentType = request.headers.get('Content-Type') ?? 'application/octet-stream'
    await env.FILES.put(`${bucket}/${path}`, request.body, { httpMetadata: { contentType } })

    return new Response(JSON.stringify({ path }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    return error('Internal error', 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const bucket = params.bucket as string
    const path = pathParam(params)
    if (!validBucket(bucket) || !path) return error('Not found', 404)

    const userId = await requireUserId(request, env)
    if (!path.startsWith(`${userId}/`)) return error('Forbidden', 403)

    await env.FILES.delete(`${bucket}/${path}`)
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    return error('Internal error', 500)
  }
}
