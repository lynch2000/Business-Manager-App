import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { db } from '../lib/db'
import { storage } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { processReceiptFile } from '../lib/image'
import { scanReceipt } from '../lib/receiptScan'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../types'
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '../components/ui'
import { BackIcon, CameraIcon, ImageIcon, ReceiptIcon } from '../components/Icons'

type Stage = 'capture' | 'scanning' | 'review'
type Destination = 'expense' | 'creditor'

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

export default function ReceiptCapture() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [stage, setStage] = useState<Stage>('capture')
  const [destination, setDestination] = useState<Destination>(searchParams.get('owed') ? 'creditor' : 'expense')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewIsPdf, setPreviewIsPdf] = useState(false)
  const [receiptPath, setReceiptPath] = useState<string | null>(null)
  const [scanNote, setScanNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Materials & Parts')
  const [amount, setAmount] = useState('')
  const [vatAmount, setVatAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [notes, setNotes] = useState('')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  async function handleFile(file: File | undefined) {
    if (!file || !user) return
    const isPdf = file.type === 'application/pdf'
    setPreviewIsPdf(isPdf)
    setPreviewUrl(URL.createObjectURL(file))
    setStage('scanning')
    setScanNote(null)

    try {
      const { blob, base64, mimeType } = await processReceiptFile(file)

      const ext = isPdf ? 'pdf' : 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await storage.from('receipts').upload(path, blob, { contentType: mimeType })
      if (!uploadError) setReceiptPath(path)

      try {
        const scanned = await scanReceipt(base64, mimeType)
        if (scanned.vendor) setVendor(scanned.vendor)
        if (scanned.expense_date) setDate(scanned.expense_date)
        if (typeof scanned.amount === 'number') setAmount(String(scanned.amount))
        if (typeof scanned.vat_amount === 'number') setVatAmount(String(scanned.vat_amount))
        if (scanned.category) setCategory(scanned.category)
        if (scanned.description) setNotes(scanned.description)
        if (!scanned.vendor && !scanned.amount) {
          setScanNote("Couldn't read the details automatically — check them below.")
        }
      } catch {
        setScanNote("Automatic scanning isn't set up yet — the file was saved, just fill in the details below.")
      }
    } catch (err) {
      setScanNote(err instanceof Error ? err.message : 'Could not process that file — you can still enter the details manually.')
    }

    setStage('review')
  }

  function skipPhoto() {
    setStage('review')
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!user || !amount) return
    setSaving(true)

    const { error } =
      destination === 'expense'
        ? await db.from('expenses').insert({
            user_id: user.id,
            vendor: vendor || 'Unknown',
            category,
            amount: Number(amount),
            vat_amount: vatAmount ? Number(vatAmount) : null,
            expense_date: date,
            receipt_path: receiptPath,
            notes: notes || null,
          })
        : await db.from('creditors').insert({
            user_id: user.id,
            supplier_name: vendor || 'Unknown',
            description: notes || null,
            amount: Number(amount),
            invoice_date: date,
            due_date: dueDate || null,
            receipt_path: receiptPath,
          })

    setSaving(false)
    if (!error) navigate(destination === 'expense' ? '/expenses' : '/accounts')
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title="Add receipt" />
      </div>

      {stage === 'capture' && (
        <div className="space-y-3">
          <Card className="text-center text-sm text-slate-500">
            Snap or upload a receipt, docket or supplier invoice — we'll try to read the vendor, date and amount for you.
          </Card>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <Button className="w-full" onClick={() => cameraInputRef.current?.click()}>
            <CameraIcon width={18} height={18} /> Take photo
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => libraryInputRef.current?.click()}>
            <ImageIcon width={18} height={18} /> Choose photo
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <ReceiptIcon width={18} height={18} /> Upload a file (photo or PDF)
          </Button>
          <button type="button" onClick={skipPhoto} className="w-full text-center text-sm text-slate-400">
            Skip — enter manually
          </button>
        </div>
      )}

      {stage === 'scanning' && (
        <div className="space-y-3 text-center">
          <ReceiptPreview previewUrl={previewUrl} isPdf={previewIsPdf} />
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            Reading receipt…
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div className="space-y-4">
          <ReceiptPreview previewUrl={previewUrl} isPdf={previewIsPdf} />
          {scanNote && <p className="text-center text-sm text-amber-600">{scanNote}</p>}

          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDestination('expense')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${destination === 'expense' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Already paid
            </button>
            <button
              type="button"
              onClick={() => setDestination('creditor')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${destination === 'creditor' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Not paid yet — I owe this
            </button>
          </div>
          <p className="text-center text-xs text-slate-400">
            {destination === 'expense'
              ? "Goes into Expenses as something you've already paid for."
              : 'Goes into Accounts → Creditors as a bill you still owe.'}
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <Field label={destination === 'expense' ? 'Vendor' : 'Supplier'}>
              <Input required value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Donegal Refrigerant Supplies" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={destination === 'expense' ? 'Amount (total, inc. VAT)' : 'Amount owed'}>
                <Input type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              {destination === 'expense' ? (
                <Field label="VAT amount">
                  <Input type="number" min={0} step="0.01" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} placeholder="optional" />
                </Field>
              ) : (
                <Field label="Due date">
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={destination === 'expense' ? 'Date' : 'Invoice date'}>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              {destination === 'expense' && (
                <Field label="Category">
                  <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            <Field label="Notes">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <Button type="submit" className="w-full" disabled={saving || !amount}>
              {saving ? 'Saving…' : destination === 'expense' ? 'Save expense' : 'Save to what you owe'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

function ReceiptPreview({ previewUrl, isPdf }: { previewUrl: string | null; isPdf: boolean }) {
  if (!previewUrl) return null
  if (isPdf) {
    return (
      <Card className="mx-auto flex max-w-xs items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <ReceiptIcon width={20} height={20} />
        </div>
        <span className="text-sm text-slate-600">PDF attached</span>
      </Card>
    )
  }
  return <img src={previewUrl} alt="" className="mx-auto max-h-72 rounded-2xl border border-slate-200 object-contain" />
}
