import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import type { Customer, Invoice, Quote, ServiceRecord } from '../../types'
import { Button, Card, PageHeader, Spinner, StatusBadge } from '../../components/ui'
import { BackIcon, BankIcon, MailIcon } from '../../components/Icons'
import { formatCurrency, formatDate } from '../../lib/currency'
import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import { sendEmail, buildMailto } from '../../lib/email'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useBusinessSettings()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingBank, setSendingBank] = useState(false)
  const [bankMsg, setBankMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('quotes').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      supabase.from('service_records').select('*').eq('customer_id', id).order('next_due_date'),
    ]).then(([c, q, i, s]) => {
      setCustomer(c.data as Customer)
      setQuotes((q.data as Quote[]) ?? [])
      setInvoices((i.data as Invoice[]) ?? [])
      setServices((s.data as ServiceRecord[]) ?? [])
      setLoading(false)
    })
  }, [id])

  async function handleSendBankDetails() {
    if (!customer || !settings) return
    setSendingBank(true)
    setBankMsg(null)
    const html = `
      <p>Hi ${customer.name},</p>
      <p>Here are our bank details for payment:</p>
      <ul>
        <li><strong>Account name:</strong> ${settings.account_name || settings.business_name}</li>
        <li><strong>Bank:</strong> ${settings.bank_name || ''}</li>
        <li><strong>IBAN:</strong> ${settings.iban || ''}</li>
        <li><strong>BIC:</strong> ${settings.bic || ''}</li>
      </ul>
      <p>Thanks,<br/>${settings.business_name}</p>
    `
    const text = `Bank details for payment:\nAccount name: ${settings.account_name || settings.business_name}\nBank: ${settings.bank_name || ''}\nIBAN: ${settings.iban || ''}\nBIC: ${settings.bic || ''}`

    if (customer.email) {
      try {
        await sendEmail({ to: customer.email, subject: `Payment details — ${settings.business_name}`, html })
        setBankMsg('Bank details emailed.')
      } catch {
        window.open(buildMailto(customer.email, `Payment details — ${settings.business_name}`, text), '_blank')
        setBankMsg('Opened your mail app with the details filled in.')
      }
    } else {
      setBankMsg('This customer has no email address on file.')
    }
    setSendingBank(false)
  }

  if (loading) return <Spinner />
  if (!customer) return <p>Customer not found.</p>

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader
          title={customer.name}
          action={
            <Link to={`/customers/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          }
        />
      </div>

      <Card className="mb-4 space-y-1 text-sm text-slate-600">
        {customer.phone && <p>📞 {customer.phone}</p>}
        {customer.email && <p>✉️ {customer.email}</p>}
        {(customer.address_line1 || customer.city) && (
          <p>
            📍 {[customer.address_line1, customer.address_line2, customer.city, customer.county, customer.eircode]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
        {customer.notes && <p className="pt-1 text-slate-500">{customer.notes}</p>}
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link to={`/quotes/new?customer=${id}`}>
          <Button variant="secondary" className="w-full">New quote</Button>
        </Link>
        <Link to={`/invoices/new?customer=${id}`}>
          <Button variant="secondary" className="w-full">New invoice</Button>
        </Link>
      </div>

      <Button variant="secondary" className="mb-2 w-full" onClick={handleSendBankDetails} disabled={sendingBank}>
        <BankIcon width={18} height={18} />
        {sendingBank ? 'Sending…' : 'Send bank details'}
      </Button>
      {bankMsg && <p className="mb-4 text-center text-sm text-slate-500">{bankMsg}</p>}

      <Section title="Servicing">
        {services.length === 0 ? (
          <p className="text-sm text-slate-400">No service records.</p>
        ) : (
          services.map((s) => (
            <div key={s.id} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <div>
                <p className="font-medium text-slate-800">{s.service_type}</p>
                <p className="text-slate-400">Last: {formatDate(s.service_date)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">Next due</p>
                <p className="font-medium text-slate-800">{formatDate(s.next_due_date)}</p>
              </div>
            </div>
          ))
        )}
        <Link to={`/services/new?customer=${id}`} className="mt-2 inline-block text-sm text-brand-600">
          + Log a service
        </Link>
      </Section>

      <Section title="Quotes">
        {quotes.length === 0 ? (
          <p className="text-sm text-slate-400">No quotes yet.</p>
        ) : (
          quotes.map((q) => (
            <Link key={q.id} to={`/quotes/${q.id}`} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span className="font-medium text-slate-800">{q.quote_number}</span>
              <span className="flex items-center gap-2">
                {formatCurrency(q.total)}
                <StatusBadge status={q.status} />
              </span>
            </Link>
          ))
        )}
      </Section>

      <Section title="Invoices">
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-400">No invoices yet.</p>
        ) : (
          invoices.map((inv) => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span className="font-medium text-slate-800">{inv.invoice_number}</span>
              <span className="flex items-center gap-2">
                {formatCurrency(inv.total)}
                <StatusBadge status={inv.status} />
              </span>
            </Link>
          ))
        )}
      </Section>

      {customer.email && (
        <a href={`mailto:${customer.email}`} className="mt-4 flex items-center justify-center gap-2 text-sm text-brand-600">
          <MailIcon width={16} height={16} /> Email customer
        </a>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </Card>
  )
}
