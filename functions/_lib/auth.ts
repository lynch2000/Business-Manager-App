import { SignJWT, jwtVerify } from 'jose'
import type { Env } from './env'
import { HttpError } from './response'

const PBKDF2_ITERATIONS = 100_000
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days — this is a single-owner app on a personal phone

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

async function deriveHash(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
}

/** Format: pbkdf2$<iterations>$<salt-hex>$<hash-hex> */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveHash(password, salt)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt.buffer as ArrayBuffer)}$${toHex(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsStr, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'pbkdf2') return false
  const salt = fromHex(saltHex)
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: Number(iterationsStr), hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return toHex(hash) === hashHex
}

function jwtSecretKey(env: Env): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function signToken(userId: string, env: Env): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS)
    .sign(jwtSecretKey(env))
}

export async function requireUserId(request: Request, env: Env): Promise<string> {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) throw new HttpError('Not authenticated', 401)
  const token = header.slice('Bearer '.length)
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey(env))
    if (typeof payload.sub !== 'string') throw new HttpError('Not authenticated', 401)
    return payload.sub
  } catch {
    throw new HttpError('Not authenticated', 401)
  }
}
