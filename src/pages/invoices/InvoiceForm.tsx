import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import type { Invoice, InvoiceItem } from '../../types'
import { Button, Field, Input, PageHeader, Spinner, Textarea } from '../../components/ui'
import { BackIcon } from '../../components/Icons'
import CustomerSelect from '../../components/CustomerSelect'
import LineItemsEditor, { computeTotals, lineTotal, newLineItem, type EditableLineItem } from '../../components/LineItemsEditor'

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export default function InvoiceForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { settings } = useBusinessSettings()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState(searchParams.get('customer') ?? '')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [vatRate, setVatRate] = useState(23)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 14 days.')
  const [items, setItems] = useState<EditableLineItem[]>([newLineItem()])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings && !isEdit) setVatRate(settings.default_vat_rate)
  }, [settings, isEdit])

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('invoices').select('*').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    ]).then(([inv, i]) => {
      const invoice = inv.data as Invoice
      if (invoice) {
        setCustomerId(invoice.customer_id)
        setIssueDate(invoice.issue_date)
        setDueDate(invoice.due_date ?? '')
        setVatRate(invoice.vat_rate)
        setNotes(invoice.notes ?? '')
        setTerms(invoice.terms ?? '')
      }
      const invoiceItems = (i.data as InvoiceItem[]) ?? []
      setItems(
        invoiceItems.length
          ? invoiceItems.map((it) => ({ key: it.id, description: it.description, quantity: it.quantity, unit_price: it.unit_price }))
          : [newLineItem()],
      )
      setLoading(false)
    })
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !customerId) return
    setSaving(true)

    const { subtotal, vat_amount, total } = computeTotals(items, vatRate)
    const payload = {
      customer_id: customerId,
      issue_date: issueDate,
      due_date: dueDate || null,
      vat_rate: vatRate,
      subtotal,
      vat_amount,
      total,
      notes: notes || null,
      terms: terms || null,
    }

    let invoiceId = id

    if (isEdit) {
      await supabase.from('invoices').update(payload).eq('id', id)
      await supabase.from('invoice_items').delete().eq('invoice_id', id)
    } else {
      const { data: numberData } = await supabase.rpc('next_document_number', { p_doc_type: 'invoice' })
      const { data, error } = await supabase
        .from('invoices')
        .insert({ ...payload, user_id: user.id, invoice_number: numberData ?? `INV-${Date.now()}` })
        .select('id')
        .single()
      if (error || !data) {
        setSaving(false)
        return
      }
      invoiceId = data.id
    }

    const itemRows = items
      .filter((it) => it.description.trim() || it.unit_price)
      .map((it, index) => ({
        invoice_id: invoiceId,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: lineTotal(it),
        sort_order: index,
      }))

    if (itemRows.length) await supabase.from('invoice_items').insert(itemRows)

    setSaving(false)
    navigate(`/invoices/${invoiceId}`)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title={isEdit ? 'Edit invoice' : 'New invoice'} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <CustomerSelect value={customerId} onChange={setCustomerId} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Issue date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        <Field label="VAT rate (%)">
          <Input type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Line items</span>
          <LineItemsEditor items={items} onChange={setItems} vatRate={vatRate} />
        </div>

        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Terms">
          <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
        </Field>

        <Button type="submit" className="w-full" disabled={saving || !customerId}>
          {saving ? 'Saving…' : 'Save invoice'}
        </Button>
      </form>
    </div>
  )
}
