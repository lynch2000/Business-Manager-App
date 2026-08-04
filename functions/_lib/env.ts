export interface Env {
  DB: D1Database
  FILES: R2Bucket
  JWT_SECRET: string
  FILE_SIGNING_SECRET: string
  RESEND_API_KEY?: string
  FROM_EMAIL?: string
  ANTHROPIC_API_KEY?: string
}
