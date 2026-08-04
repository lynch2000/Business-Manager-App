import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { db } from '../../lib/db'
import { storage } from '../../lib/storage'
import type { Expense, ExpenseCategory } from '../../types'
import { EXPENSE_CATEGORIES } from '../../types'
import { Button, Card, Field, Input, PageHeader, Select, Spinner, Textarea } from '../../components/ui'
import { BackIcon } from '../../components/Icons'

export default function ExpenseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Other')
  const [amount, setAmount] = useState('')
  const [vatAmount, setVatAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!id) return
    db
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single()
      .then(async ({ data }) => {
        const e = data as Expense
        setExpense(e)
        if (e) {
          setVendor(e.vendor)
          setCategory(e.category)
          setAmount(String(e.amount))
          setVatAmount(e.vat_amount != null ? String(e.vat_amount) : '')
          setExpenseDate(e.expense_date)
          setNotes(e.notes ?? '')

          if (e.receipt_path) {
            const { data: signed } = await storage.from('receipts').createSignedUrl(e.receipt_path, 3600)
            if (signed) setPhotoUrl(signed.signedUrl)
          }
        }
        setLoading(false)
      })
  }, [id])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!expense) return
    setSaving(true)
    await db
      .from('expenses')
      .update({
        vendor,
        category,
        amount: Number(amount),
        vat_amount: vatAmount ? Number(vatAmount) : null,
        expense_date: expenseDate,
        notes: notes || null,
      })
      .eq('id', expense.id)
    setSaving(false)
    navigate('/expenses')
  }

  async function handleDelete() {
    if (!expense || !confirm('Delete this expense?')) return
    setDeleting(true)
    if (expense.receipt_path) await storage.from('receipts').remove([expense.receipt_path])
    await db.from('expenses').delete().eq('id', expense.id)
    setDeleting(false)
    navigate('/expenses')
  }

  if (loading) return <Spinner />
  if (!expense) return <p>Expense not found.</p>

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title="Expense" />
      </div>

      {photoUrl && (
        <Card className="mb-4">
          <img src={photoUrl} alt="Receipt" className="mx-auto max-h-80 rounded-xl object-contain" />
        </Card>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Vendor">
          <Input required value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (total, inc. VAT)">
            <Input type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="VAT amount">
            <Input type="number" min={0} step="0.01" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} placeholder="optional" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="danger" className="w-full" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete expense'}
        </Button>
      </form>
    </div>
  )
}
