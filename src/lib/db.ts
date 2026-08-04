import { apiFetch } from './api'

// A tiny stand-in for the subset of the supabase-js query builder this app
// actually uses (select/eq/in/gte/lte/order/single/maybeSingle/insert/update
// /delete), backed by fetch calls to our own /api/:table endpoint. Swapping
// the backend meant every page kept its `db.from('table')...` call sites
// unchanged — only the import changed. Every call site already casts the
// result with `as SomeType` (matching how they used supabase-js before), so
// `data` is deliberately untyped here rather than fighting generic inference
// through a custom thenable.

type FilterOp = 'eq' | 'in' | 'gte' | 'lte'
type Filter = [string, FilterOp, unknown]
type Mode = 'select' | 'insert' | 'update' | 'delete'
type SingleMode = 'none' | 'single' | 'maybeSingle'

export interface DbResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  error: { message: string } | null
}

class QueryBuilder implements PromiseLike<DbResult> {
  private table: string
  private filters: Filter[] = []
  private orderSpec?: [string, boolean]
  private embed = false
  private mode: Mode = 'select'
  private payload?: unknown
  private singleMode: SingleMode = 'none'

  constructor(table: string) {
    this.table = table
  }

  select(cols = '*'): this {
    if (cols.includes('customer:customers')) this.embed = true
    return this
  }

  eq(col: string, val: unknown): this {
    this.filters.push([col, 'eq', val])
    return this
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push([col, 'in', vals])
    return this
  }

  gte(col: string, val: unknown): this {
    this.filters.push([col, 'gte', val])
    return this
  }

  lte(col: string, val: unknown): this {
    this.filters.push([col, 'lte', val])
    return this
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderSpec = [col, opts?.ascending ?? true]
    return this
  }

  single(): this {
    this.singleMode = 'single'
    return this
  }

  maybeSingle(): this {
    this.singleMode = 'maybeSingle'
    return this
  }

  insert(payload: unknown): this {
    this.mode = 'insert'
    this.payload = payload
    return this
  }

  update(payload: unknown): this {
    this.mode = 'update'
    this.payload = payload
    return this
  }

  delete(): this {
    this.mode = 'delete'
    return this
  }

  private queryString(): string {
    const descriptor = { filters: this.filters, order: this.orderSpec, embed: this.embed }
    return `?q=${encodeURIComponent(JSON.stringify(descriptor))}`
  }

  private async execute(): Promise<DbResult> {
    try {
      let res: Response
      if (this.mode === 'select') {
        res = await apiFetch(`/api/${this.table}${this.queryString()}`)
      } else if (this.mode === 'insert') {
        res = await apiFetch(`/api/${this.table}`, { method: 'POST', body: JSON.stringify(this.payload) })
      } else if (this.mode === 'update') {
        res = await apiFetch(`/api/${this.table}${this.queryString()}`, {
          method: 'PATCH',
          body: JSON.stringify(this.payload),
        })
      } else {
        res = await apiFetch(`/api/${this.table}${this.queryString()}`, { method: 'DELETE' })
      }

      const body = await res.json().catch(() => null)
      if (!res.ok) {
        return { data: null, error: { message: (body as { error?: string })?.error ?? res.statusText } }
      }

      let data = body
      if ((this.mode === 'select' || this.mode === 'update') && this.singleMode !== 'none') {
        data = Array.isArray(body) ? (body[0] ?? null) : body
      }

      return { data, error: null }
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } }
    }
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }
}

export const db = {
  from(table: string) {
    return new QueryBuilder(table)
  },
}
