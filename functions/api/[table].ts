// Generic CRUD endpoint for /api/:table — a small hand-rolled stand-in for
// what Supabase's PostgREST + row-level security used to provide. Ownership
// is enforced here in code (see TABLES/COLUMNS) since D1 has no RLS.
import type { Env } from '../_lib/env'
import { requireUserId } from '../_lib/auth'
import { json, error, HttpError } from '../_lib/response'
import { TABLES, PROTECTED_COLUMNS } from '../_lib/tables'
import { COLUMNS } from '../_lib/columns'
import { parseQueryDescriptor, buildWhere, buildOrderBy, type Filter } from '../_lib/query'

async function assertParentOwnership(env: Env, userId: string, parentTable: string, parentId: unknown) {
  const row = await env.DB.prepare(`SELECT user_id FROM ${parentTable} WHERE id = ?`).bind(parentId).first<{
    user_id: string
  }>()
  if (!row || row.user_id !== userId) throw new HttpError('Not found', 404)
}

async function attachEmbeds(env: Env, table: string, rows: Record<string, unknown>[]) {
  const config = TABLES[table]
  if (!config.embed || rows.length === 0) return rows
  const { table: embedTable, localKey, column } = config.embed
  const ids = [...new Set(rows.map((r) => r[localKey]).filter(Boolean))] as string[]
  if (ids.length === 0) return rows

  const placeholders = ids.map(() => '?').join(',')
  const related = await env.DB.prepare(`SELECT * FROM ${embedTable} WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all()
  const byId = new Map((related.results as Record<string, unknown>[]).map((r) => [r.id, r]))
  return rows.map((r) => ({ ...r, [column]: byId.get(r[localKey] as string) ?? null }))
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const table = params.table as string
    const config = TABLES[table]
    if (!config) return error('Unknown table', 404)

    const userId = await requireUserId(request, env)
    const url = new URL(request.url)
    const descriptor = parseQueryDescriptor(url)
    const filters: Filter[] = (descriptor.filters ?? []).filter(([col]) => col !== 'user_id')

    const scope = config.scope
    if (scope === 'direct') {
      filters.push(['user_id', 'eq', userId])
    } else {
      const parentId = filters.find(([col]) => col === scope.parentColumn)?.[2]
      if (!parentId) return error(`${scope.parentColumn} filter is required`, 400)
      await assertParentOwnership(env, userId, scope.parentTable, parentId)
    }

    const { clause, values } = buildWhere(table, filters)
    const orderBy = buildOrderBy(table, descriptor.order)
    const sql = `SELECT * FROM ${table}${clause ? ` WHERE ${clause}` : ''}${orderBy}`
    const result = await env.DB.prepare(sql)
      .bind(...values)
      .all()

    const rows = descriptor.embed
      ? await attachEmbeds(env, table, result.results as Record<string, unknown>[])
      : result.results

    return json(rows)
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    console.error(err)
    return error('Internal error', 500)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const table = params.table as string
    const config = TABLES[table]
    if (!config) return error('Unknown table', 404)

    const userId = await requireUserId(request, env)
    const body = await request.json()
    const rows = Array.isArray(body) ? body : [body]
    const now = new Date().toISOString()
    const inserted: Record<string, unknown>[] = []

    for (const row of rows as Record<string, unknown>[]) {
      const clean: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        if (COLUMNS[table]?.has(key) && !PROTECTED_COLUMNS.has(key)) clean[key] = value
      }

      const scope = config.scope
      if (scope === 'direct') {
        clean.user_id = userId
      } else {
        const parentId = clean[scope.parentColumn]
        if (!parentId) return error(`${scope.parentColumn} is required`, 400)
        await assertParentOwnership(env, userId, scope.parentTable, parentId)
      }

      clean.id = crypto.randomUUID()
      if (COLUMNS[table]?.has('created_at')) clean.created_at = now
      if (config.hasUpdatedAt) clean.updated_at = now

      const columns = Object.keys(clean)
      const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')}) RETURNING *`
      const result = await env.DB.prepare(sql)
        .bind(...columns.map((c) => clean[c]))
        .first<Record<string, unknown>>()
      if (result) inserted.push(result)
    }

    return json(Array.isArray(body) ? inserted : inserted[0], 201)
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    console.error(err)
    return error('Internal error', 500)
  }
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const table = params.table as string
    const config = TABLES[table]
    if (!config) return error('Unknown table', 404)

    const userId = await requireUserId(request, env)
    const url = new URL(request.url)
    const descriptor = parseQueryDescriptor(url)
    const filters: Filter[] = (descriptor.filters ?? []).filter(([col]) => col !== 'user_id')

    const scope = config.scope
    if (scope === 'direct') {
      filters.push(['user_id', 'eq', userId])
    } else {
      const parentId = filters.find(([col]) => col === scope.parentColumn)?.[2]
      if (!parentId) return error(`${scope.parentColumn} filter is required`, 400)
      await assertParentOwnership(env, userId, scope.parentTable, parentId)
    }

    const body = (await request.json()) as Record<string, unknown>
    const clean: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (COLUMNS[table]?.has(key) && !PROTECTED_COLUMNS.has(key)) clean[key] = value
    }
    if (config.hasUpdatedAt) clean.updated_at = new Date().toISOString()
    if (Object.keys(clean).length === 0) return error('No valid fields to update', 400)

    const setClause = Object.keys(clean)
      .map((c) => `${c} = ?`)
      .join(', ')
    const { clause: whereClause, values: whereValues } = buildWhere(table, filters)
    const sql = `UPDATE ${table} SET ${setClause}${whereClause ? ` WHERE ${whereClause}` : ''} RETURNING *`
    const result = await env.DB.prepare(sql)
      .bind(...Object.values(clean), ...whereValues)
      .all()

    return json(result.results)
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    console.error(err)
    return error('Internal error', 500)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  try {
    const table = params.table as string
    const config = TABLES[table]
    if (!config) return error('Unknown table', 404)

    const userId = await requireUserId(request, env)
    const url = new URL(request.url)
    const descriptor = parseQueryDescriptor(url)
    const filters: Filter[] = (descriptor.filters ?? []).filter(([col]) => col !== 'user_id')

    const scope = config.scope
    if (scope === 'direct') {
      filters.push(['user_id', 'eq', userId])
    } else {
      const parentId = filters.find(([col]) => col === scope.parentColumn)?.[2]
      if (!parentId) return error(`${scope.parentColumn} filter is required`, 400)
      await assertParentOwnership(env, userId, scope.parentTable, parentId)
    }

    const { clause, values } = buildWhere(table, filters)
    if (!clause) return error('A filter is required to delete', 400)
    await env.DB.prepare(`DELETE FROM ${table} WHERE ${clause}`)
      .bind(...values)
      .run()

    return json({ ok: true })
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status)
    console.error(err)
    return error('Internal error', 500)
  }
}
