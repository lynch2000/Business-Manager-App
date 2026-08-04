import { HttpError } from './response'
import { COLUMNS } from './columns'

export type FilterOp = 'eq' | 'in' | 'gte' | 'lte'
export type Filter = [column: string, op: FilterOp, value: unknown]

export interface QueryDescriptor {
  filters?: Filter[]
  order?: [column: string, ascending: boolean]
  embed?: boolean
}

export function parseQueryDescriptor(url: URL): QueryDescriptor {
  const raw = url.searchParams.get('q')
  if (!raw) return {}
  try {
    return JSON.parse(raw) as QueryDescriptor
  } catch {
    throw new HttpError('Invalid query', 400)
  }
}

function assertColumn(table: string, column: string) {
  if (!COLUMNS[table]?.has(column)) throw new HttpError(`Unknown column ${table}.${column}`, 400)
}

/** Builds a `WHERE a = ? AND b IN (?,?)` clause (no leading WHERE) plus bound values. */
export function buildWhere(table: string, filters: Filter[]): { clause: string; values: unknown[] } {
  const parts: string[] = []
  const values: unknown[] = []

  for (const [column, op, value] of filters) {
    assertColumn(table, column)
    if (op === 'eq') {
      parts.push(`${column} = ?`)
      values.push(value)
    } else if (op === 'gte') {
      parts.push(`${column} >= ?`)
      values.push(value)
    } else if (op === 'lte') {
      parts.push(`${column} <= ?`)
      values.push(value)
    } else if (op === 'in') {
      const arr = Array.isArray(value) ? value : []
      if (arr.length === 0) {
        parts.push('0')
      } else {
        parts.push(`${column} IN (${arr.map(() => '?').join(',')})`)
        values.push(...arr)
      }
    } else {
      throw new HttpError(`Unsupported filter op ${op}`, 400)
    }
  }

  return { clause: parts.join(' AND '), values }
}

export function buildOrderBy(table: string, order?: [string, boolean]): string {
  if (!order) return ''
  const [column, ascending] = order
  assertColumn(table, column)
  return ` ORDER BY ${column} ${ascending ? 'ASC' : 'DESC'}`
}

export { assertColumn }
