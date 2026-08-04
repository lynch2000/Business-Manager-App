export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'void'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'other'
export type CreditorStatus = 'unpaid' | 'paid'

export interface BusinessSettings {
  id: string
  user_id: string
  business_name: string
  owner_name: string | null
  address: string | null
  phone: string | null
  email: string | null
  vat_number: string | null
  iban: string | null
  bic: string | null
  bank_name: string | null
  account_name: string | null
  default_vat_rate: number
  quote_prefix: string
  invoice_prefix: string
  next_quote_number: number
  next_invoice_number: number
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  county: string | null
  eircode: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export interface QuoteItem extends LineItem {
  quote_id: string
}

export interface InvoiceItem extends LineItem {
  invoice_id: string
}

export interface Quote {
  id: string
  user_id: string
  customer_id: string
  quote_number: string
  status: QuoteStatus
  issue_date: string
  valid_until: string | null
  notes: string | null
  terms: string | null
  vat_rate: number
  subtotal: number
  vat_amount: number
  total: number
  created_at: string
  updated_at: string
  customer?: Customer
  quote_items?: QuoteItem[]
}

export interface Invoice {
  id: string
  user_id: string
  customer_id: string
  quote_id: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  notes: string | null
  terms: string | null
  vat_rate: number
  subtotal: number
  vat_amount: number
  total: number
  amount_paid: number
  created_at: string
  updated_at: string
  customer?: Customer
  invoice_items?: InvoiceItem[]
  payments?: Payment[]
}

export interface Payment {
  id: string
  user_id: string
  invoice_id: string
  amount: number
  payment_date: string
  method: PaymentMethod
  notes: string | null
  created_at: string
}

export interface Creditor {
  id: string
  user_id: string
  supplier_name: string
  description: string | null
  amount: number
  invoice_date: string
  due_date: string | null
  status: CreditorStatus
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ServiceRecord {
  id: string
  user_id: string
  customer_id: string
  service_type: string
  equipment: string | null
  service_date: string
  interval_months: number
  next_due_date: string
  notes: string | null
  reminder_sent: boolean
  created_at: string
  updated_at: string
  customer?: Customer
}
