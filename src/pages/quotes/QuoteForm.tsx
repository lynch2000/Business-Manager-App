import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { db } from '../../lib/db'
import { nextDocumentNumber } from '../../lib/documentNumber'
import { useAuth } from '../../context/AuthContext'
import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import type { Quote, QuoteItem } from '../../types'
import { Button, Field, Input, PageHeader, Spinner, Textarea } from '../../components/ui'
import { BackIcon } from '../../components/Icons'
import CustomerSelect from '../../components/CustomerSelect'
import LineItemsEditor, { computeTotals, lineTotal, newLineItem, type EditableLineItem } from '../../components/LineItemsEditor'

export default function QuoteForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { settings } = useBusinessSettings()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState(searchParams.get('customer') ?? '')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [validUntil, setValidUntil] = useState('')
  const [vatRate, setVatRate] = useState(23)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Prices valid for 30 days.')
  const [items, setItems] = useState<EditableLineItem[]>([newLineItem()])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings && !isEdit) setVatRate(settings.default_vat_rate)
  }, [settings, isEdit])

  useEffect(() => {
    if (!id) return
    Promise.all([
      db.from('quotes').select('*').eq('id', id).single(),
      db.from('quote_items').select('*').eq('quote_id', id).order('sort_order'),
    ]).then(([q, i]) => {
      const quote = q.data as Quote
      if (quote) {
        setCustomerId(quote.customer_id)
        setIssueDate(quote.issue_date)
        setValidUntil(quote.valid_until ?? '')
        setVatRate(quote.vat_rate)
        setNotes(quote.notes ?? '')
        setTerms(quote.terms ?? '')
      }
      const quoteItems = (i.data as QuoteItem[]) ?? []
      setItems(
        quoteItems.length
          ? quoteItems.map((it) => ({ key: it.id, description: it.description, quantity: it.quantity, unit_price: it.unit_price }))
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
      valid_until: validUntil || null,
      vat_rate: vatRate,
      subtotal,
      vat_amount,
      total,
      notes: notes || null,
      terms: terms || null,
    }

    let quoteId = id

    if (isEdit) {
      await db.from('quotes').update(payload).eq('id', id)
      await db.from('quote_items').delete().eq('quote_id', id)
    } else {
      const numberData = await nextDocumentNumber('quote')
      const { data, error } = await db
        .from('quotes')
        .insert({ ...payload, user_id: user.id, quote_number: numberData ?? `Q-${Date.now()}` })
        .select('id')
        .single()
      if (error || !data) {
        setSaving(false)
        return
      }
      quoteId = data.id
    }

    const itemRows = items
      .filter((it) => it.description.trim() || it.unit_price)
      .map((it, index) => ({
        quote_id: quoteId,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: lineTotal(it),
        sort_order: index,
      }))

    if (itemRows.length) await db.from('quote_items').insert(itemRows)

    setSaving(false)
    navigate(`/quotes/${quoteId}`)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title={isEdit ? 'Edit quote' : 'New quote'} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <CustomerSelect value={customerId} onChange={setCustomerId} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Issue date">
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label="Valid until">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
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
          {saving ? 'Saving…' : 'Save quote'}
        </Button>
      </form>
    </div>
  )
}
