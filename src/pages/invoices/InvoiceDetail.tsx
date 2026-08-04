import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import type { Customer, Invoice, InvoiceItem, Payment, PaymentMethod } from '../../types'
import { Button, Card, Field, Input, PageHeader, Select, Spinner, StatusBadge } from '../../components/ui'
import { BackIcon, DownloadIcon, MailIcon } from '../../components/Icons'
import { formatCurrency, formatDate, round2 } from '../../lib/currency'
import { buildDocumentPdf } from '../../lib/pdf'
import { sendPdfDocument } from '../../lib/documentSend'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useBusinessSettings()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<string | null>(null)

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [recordingPayment, setRecordingPayment] = useState(false)

  async function load() {
    if (!id) return
    const [inv, i, p] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(*)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
      supabase.from('payments').select('*').eq('invoice_id', id).order('payment_date', { ascending: false }),
    ])
    setInvoice(inv.data as Invoice)
    setCustomer((inv.data as Invoice)?.customer as Customer)
    setItems((i.data as InvoiceItem[]) ?? [])
    setPayments((p.data as Payment[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function buildPdf() {
    if (!invoice || !customer || !settings) return null
    return buildDocumentPdf({
      kind: 'Invoice',
      number: invoice.invoice_number,
      status: invoice.status,
      issueDate: invoice.issue_date,
      dueOrValidDate: invoice.due_date,
      dueOrValidLabel: 'Due date',
      customer,
      items,
      subtotal: invoice.subtotal,
      vatRate: invoice.vat_rate,
      vatAmount: invoice.vat_amount,
      total: invoice.total,
      amountPaid: invoice.amount_paid,
      notes: invoice.notes,
      terms: invoice.terms,
      settings,
    })
  }

  async function handleDownload() {
    const doc = await buildPdf()
    doc?.save(`${invoice?.invoice_number}.pdf`)
  }

  async function handleSend() {
    if (!invoice || !customer) return
    const doc = await buildPdf()
    if (!doc) return
    setSending(true)
    setSendMsg(null)
    const result = await sendPdfDocument({
      doc,
      filename: `${invoice.invoice_number}.pdf`,
      to: customer.email,
      subject: `Invoice ${invoice.invoice_number} from ${settings?.business_name ?? ''}`,
      emailHtml: `<p>Hi ${customer.name},</p><p>Please find attached invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total)}, due ${formatDate(invoice.due_date)}.</p>${
        settings?.iban ? `<p>IBAN: ${settings.iban}${settings.bic ? ` · BIC: ${settings.bic}` : ''}</p>` : ''
      }`,
      mailtoBody: `Hi ${customer.name},\n\nPlease find attached invoice ${invoice.invoice_number} for ${formatCurrency(invoice.total)}, due ${formatDate(invoice.due_date)}.`,
    })
    if (result.method === 'email') {
      if (invoice.status === 'draft') await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id)
      setSendMsg('Invoice emailed to customer.')
      load()
    } else if (result.method === 'share') {
      setSendMsg('Opened the share sheet — pick how to send it.')
    } else {
      setSendMsg('Downloaded the PDF — attach it in the mail app that opened.')
    }
    setSending(false)
  }

  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault()
    if (!invoice) return
    const amount = Number(paymentAmount)
    if (!amount || amount <= 0) return
    setRecordingPayment(true)

    await supabase.from('payments').insert({
      user_id: invoice.user_id,
      invoice_id: invoice.id,
      amount,
      method: paymentMethod,
    })

    const newAmountPaid = round2(invoice.amount_paid + amount)
    const newStatus = newAmountPaid >= invoice.total ? 'paid' : 'partially_paid'
    await supabase.from('invoices').update({ amount_paid: newAmountPaid, status: newStatus }).eq('id', invoice.id)

    setPaymentAmount('')
    setRecordingPayment(false)
    load()
  }

  if (loading) return <Spinner />
  if (!invoice || !customer) return <p>Invoice not found.</p>

  const balance = round2(invoice.total - invoice.amount_paid)
  const isOverdue = invoice.status !== 'paid' && invoice.due_date && new Date(invoice.due_date) < new Date()

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader
          title={invoice.invoice_number}
          action={
            <Link to={`/invoices/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          }
        />
      </div>

      <div className="mb-4">
        <StatusBadge status={isOverdue ? 'overdue' : invoice.status} />
      </div>

      <Card className="mb-4">
        <p className="font-medium text-slate-900">{customer.name}</p>
        <p className="text-sm text-slate-500">
          Issued {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}
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
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>VAT ({invoice.vat_rate}%)</span>
            <span>{formatCurrency(invoice.vat_amount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <>
              <div className="flex justify-between text-slate-500">
                <span>Paid</span>
                <span>{formatCurrency(invoice.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Balance due</span>
                <span>{formatCurrency(balance)}</span>
              </div>
            </>
          )}
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

      {balance > 0 && (
        <Card className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Record a payment</h2>
          <form onSubmit={handleRecordPayment} className="flex items-end gap-2">
            <Field label="Amount">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={String(balance)}
              />
            </Field>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-36">
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </Select>
            <Button type="submit" disabled={recordingPayment}>Add</Button>
          </form>
        </Card>
      )}

      {payments.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Payment history</h2>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <span className="text-slate-600">{formatDate(p.payment_date)} · {p.method.replace('_', ' ')}</span>
              <span className="font-medium text-slate-800">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
