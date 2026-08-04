import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { db } from '../../lib/db'
import { nextDocumentNumber } from '../../lib/documentNumber'
import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import type { Customer, Quote, QuoteItem } from '../../types'
import { Button, Card, PageHeader, Select, Spinner, StatusBadge } from '../../components/ui'
import { BackIcon, DownloadIcon, MailIcon } from '../../components/Icons'
import { formatCurrency, formatDate } from '../../lib/currency'
import { buildDocumentPdf } from '../../lib/pdf'
import { sendPdfDocument } from '../../lib/documentSend'

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useBusinessSettings()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)

  async function load() {
    if (!id) return
    const [q, i] = await Promise.all([
      db.from('quotes').select('*, customer:customers(*)').eq('id', id).single(),
      db.from('quote_items').select('*').eq('quote_id', id).order('sort_order'),
    ])
    setQuote(q.data as Quote)
    setCustomer((q.data as Quote)?.customer as Customer)
    setItems((i.data as QuoteItem[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function buildPdf() {
    if (!quote || !customer || !settings) return null
    return buildDocumentPdf({
      kind: 'Quote',
      number: quote.quote_number,
      status: quote.status,
      issueDate: quote.issue_date,
      dueOrValidDate: quote.valid_until,
      dueOrValidLabel: 'Valid until',
      customer,
      items,
      subtotal: quote.subtotal,
      vatRate: quote.vat_rate,
      vatAmount: quote.vat_amount,
      total: quote.total,
      notes: quote.notes,
      terms: quote.terms,
      settings,
    })
  }

  async function handleDownload() {
    const doc = await buildPdf()
    doc?.save(`${quote?.quote_number}.pdf`)
  }

  async function handleSend() {
    if (!quote || !customer) return
    const doc = await buildPdf()
    if (!doc) return
    setSending(true)
    setSendMsg(null)
    const result = await sendPdfDocument({
      doc,
      filename: `${quote.quote_number}.pdf`,
      to: customer.email,
      subject: `Quotation ${quote.quote_number} from ${settings?.business_name ?? ''}`,
      emailHtml: `<p>Hi ${customer.name},</p><p>Please find attached quotation ${quote.quote_number} for ${formatCurrency(quote.total)}.</p>`,
      mailtoBody: `Hi ${customer.name},\n\nPlease find attached quotation ${quote.quote_number} for ${formatCurrency(quote.total)}.`,
    })
    if (result.method === 'email') {
      await db.from('quotes').update({ status: 'sent' }).eq('id', quote.id)
      setSendMsg('Quote emailed to customer.')
      load()
    } else if (result.method === 'share') {
      setSendMsg('Opened the share sheet — pick how to send it.')
    } else {
      setSendMsg('Downloaded the PDF — attach it in the mail app that opened.')
    }
    setSending(false)
  }

  async function handleStatusChange(status: Quote['status']) {
    if (!quote) return
    await db.from('quotes').update({ status }).eq('id', quote.id)
    load()
  }

  async function handleConvertToInvoice() {
    if (!quote) return
    setConverting(true)
    const numberData = await nextDocumentNumber('invoice')
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)
    const { data: invoice, error } = await db
      .from('invoices')
      .insert({
        user_id: quote.user_id,
        customer_id: quote.customer_id,
        quote_id: quote.id,
        invoice_number: numberData ?? `INV-${Date.now()}`,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate.toISOString().slice(0, 10),
        vat_rate: quote.vat_rate,
        subtotal: quote.subtotal,
        vat_amount: quote.vat_amount,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms,
      })
      .select('id')
      .single()

    if (!error && invoice) {
      const rows = items.map((it) => ({
        invoice_id: invoice.id,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.line_total,
        sort_order: it.sort_order,
      }))
      if (rows.length) await db.from('invoice_items').insert(rows)
      navigate(`/invoices/${invoice.id}`)
    }
    setConverting(false)
  }

  if (loading) return <Spinner />
  if (!quote || !customer) return <p>Quote not found.</p>

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader
          title={quote.quote_number}
          action={
            <Link to={`/quotes/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          }
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <StatusBadge status={quote.status} />
        <Select
          value={quote.status}
          onChange={(e) => handleStatusChange(e.target.value as Quote['status'])}
          className="w-40"
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </Select>
      </div>

      <Card className="mb-4">
        <p className="font-medium text-slate-900">{customer.name}</p>
        <p className="text-sm text-slate-500">
          Issued {formatDate(quote.issue_date)}
          {quote.valid_until && ` · Valid until ${formatDate(quote.valid_until)}`}
        </p>
      </Card>

      <Card className="mb-4">
        {items.map((it) => (
          <div key={it.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
            <div>
              <p className="text-slate-800">{it.description}</p>
              <p className="text-slate-400">{it.quantity} × {formatCurrency(it.unit_price)}</p>
            </div>
            <span className="font-medium text-slate-800">{formatCurrency(it.line_total)}</span>
          </div>
        ))}
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>VAT ({quote.vat_rate}%)</span>
            <span>{formatCurrency(quote.vat_amount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(quote.total)}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={handleDownload}>
          <DownloadIcon width={18} height={18} /> Download PDF
        </Button>
        <Button onClick={handleSend} disabled={sending}>
          <MailIcon width={18} height={18} /> {sending ? 'Sending…' : 'Send to customer'}
        </Button>
      </div>
      {sendMsg && <p className="mt-2 text-center text-sm text-slate-500">{sendMsg}</p>}

      {quote.status === 'accepted' && (
        <Button variant="secondary" className="mt-3 w-full" onClick={handleConvertToInvoice} disabled={converting}>
          {converting ? 'Converting…' : 'Convert to invoice'}
        </Button>
      )}
    </div>
  )
}
