export type ParentScope = { parentTable: string; parentColumn: string }

export interface TableConfig {
  scope: 'direct' | ParentScope
  hasUpdatedAt: boolean
  embed?: { column: string; table: string; localKey: string }
}

export const TABLES: Record<string, TableConfig> = {
  business_settings: { scope: 'direct', hasUpdatedAt: true },
  customers: { scope: 'direct', hasUpdatedAt: true },
  quotes: {
    scope: 'direct',
    hasUpdatedAt: true,
    embed: { column: 'customer', table: 'customers', localKey: 'customer_id' },
  },
  quote_items: { scope: { parentTable: 'quotes', parentColumn: 'quote_id' }, hasUpdatedAt: false },
  invoices: {
    scope: 'direct',
    hasUpdatedAt: true,
    embed: { column: 'customer', table: 'customers', localKey: 'customer_id' },
  },
  invoice_items: { scope: { parentTable: 'invoices', parentColumn: 'invoice_id' }, hasUpdatedAt: false },
  payments: { scope: 'direct', hasUpdatedAt: false },
  creditors: { scope: 'direct', hasUpdatedAt: true },
  expenses: { scope: 'direct', hasUpdatedAt: true },
  service_records: {
    scope: 'direct',
    hasUpdatedAt: true,
    embed: { column: 'customer', table: 'customers', localKey: 'customer_id' },
  },
}

export const PROTECTED_COLUMNS = new Set(['id', 'user_id', 'created_at'])
