// Column allowlists, matching d1/schema.sql exactly. Table and column names
// can't be parameter-bound in SQL, so every identifier that ends up in a
// query string is checked against these sets first — this is what makes it
// safe to build queries from client-supplied filter/order column names.
export const COLUMNS: Record<string, Set<string>> = {
  business_settings: new Set([
    'id', 'user_id', 'business_name', 'owner_name', 'address', 'phone', 'email', 'vat_number',
    'iban', 'bic', 'bank_name', 'account_name', 'default_vat_rate', 'quote_prefix', 'invoice_prefix',
    'next_quote_number', 'next_invoice_number', 'logo_url', 'created_at', 'updated_at',
  ]),
  customers: new Set([
    'id', 'user_id', 'name', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'county',
    'eircode', 'notes', 'created_at', 'updated_at',
  ]),
  quotes: new Set([
    'id', 'user_id', 'customer_id', 'quote_number', 'status', 'issue_date', 'valid_until', 'notes',
    'terms', 'vat_rate', 'subtotal', 'vat_amount', 'total', 'created_at', 'updated_at',
  ]),
  quote_items: new Set(['id', 'quote_id', 'description', 'quantity', 'unit_price', 'line_total', 'sort_order']),
  invoices: new Set([
    'id', 'user_id', 'customer_id', 'quote_id', 'invoice_number', 'status', 'issue_date', 'due_date',
    'notes', 'terms', 'vat_rate', 'subtotal', 'vat_amount', 'total', 'amount_paid', 'created_at', 'updated_at',
  ]),
  invoice_items: new Set(['id', 'invoice_id', 'description', 'quantity', 'unit_price', 'line_total', 'sort_order']),
  payments: new Set(['id', 'user_id', 'invoice_id', 'amount', 'payment_date', 'method', 'notes', 'created_at']),
  creditors: new Set([
    'id', 'user_id', 'supplier_name', 'description', 'amount', 'invoice_date', 'due_date', 'status',
    'paid_date', 'notes', 'receipt_path', 'created_at', 'updated_at',
  ]),
  expenses: new Set([
    'id', 'user_id', 'vendor', 'category', 'amount', 'vat_amount', 'expense_date', 'receipt_path',
    'notes', 'created_at', 'updated_at',
  ]),
  service_records: new Set([
    'id', 'user_id', 'customer_id', 'service_type', 'equipment', 'service_date', 'interval_months',
    'next_due_date', 'notes', 'reminder_sent', 'created_at', 'updated_at',
  ]),
}
