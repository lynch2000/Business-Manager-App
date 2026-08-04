import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { downscaleImage } from '../../lib/image'
import { scanReceipt } from '../../lib/receiptScan'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../../types'
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '../../components/ui'
import { BackIcon, CameraIcon, ImageIcon } from '../../components/Icons'

type Stage = 'capture' | 'scanning' | 'review'

export default function ExpenseCapture() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('capture')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [receiptPath, setReceiptPath] = useState<string | null>(null)
  const [scanNote, setScanNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Materials & Parts')
  const [amount, setAmount] = useState('')
  const [vatAmount, setVatAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  async function handleFile(file: File | undefined) {
    if (!file || !user) return
    setPreviewUrl(URL.createObjectURL(file))
    setStage('scanning')
    setScanNote(null)

    try {
      const { blob, base64, mimeType } = await downscaleImage(file)

      const path = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(path, blob, { contentType: mimeType })
      if (!uploadError) setReceiptPath(path)

      try {
        const scanned = await scanReceipt(base64, mimeType)
        if (scanned.vendor) setVendor(scanned.vendor)
        if (scanned.expense_date) setExpenseDate(scanned.expense_date)
        if (typeof scanned.amount === 'number') setAmount(String(scanned.amount))
        if (typeof scanned.vat_amount === 'number') setVatAmount(String(scanned.vat_amount))
        if (scanned.category) setCategory(scanned.category)
        if (scanned.description) setNotes(scanned.description)
        if (!scanned.vendor && !scanned.amount) {
          setScanNote("Couldn't read the details automatically — check them below.")
        }
      } catch {
        setScanNote('Automatic scanning isn\'t set up yet — the photo was saved, just fill in the details below.')
      }
    } catch {
      setScanNote('Could not process that photo — you can still enter the details manually.')
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
    const { error } = await supabase.from('expenses').insert({
      user_id: user.id,
      vendor: vendor || 'Unknown',
      category,
      amount: Number(amount),
      vat_amount: vatAmount ? Number(vatAmount) : null,
      expense_date: expenseDate,
      receipt_path: receiptPath,
      notes: notes || null,
    })
    setSaving(false)
    if (!error) navigate('/expenses')
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title="Add expense" />
      </div>

      {stage === 'capture' && (
        <div className="space-y-3">
          <Card className="text-center text-sm text-slate-500">
            Snap a photo of a receipt, docket or supplier invoice — we'll try to read the vendor, date and amount for you.
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

          <Button className="w-full" onClick={() => cameraInputRef.current?.click()}>
            <CameraIcon width={18} height={18} /> Take photo
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => libraryInputRef.current?.click()}>
            <ImageIcon width={18} height={18} /> Choose from library
          </Button>
          <button type="button" onClick={skipPhoto} className="w-full text-center text-sm text-slate-400">
            Skip — enter manually
          </button>
        </div>
      )}

      {stage === 'scanning' && (
        <div className="space-y-3 text-center">
          {previewUrl && <img src={previewUrl} alt="" className="mx-auto max-h-72 rounded-2xl border border-slate-200 object-contain" />}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            Reading receipt…
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div className="space-y-4">
          {previewUrl && <img src={previewUrl} alt="" className="mx-auto max-h-56 rounded-2xl border border-slate-200 object-contain" />}
          {scanNote && <p className="text-center text-sm text-amber-600">{scanNote}</p>}

          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Vendor">
              <Input required value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Donegal Refrigerant Supplies" />
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

            <Button type="submit" className="w-full" disabled={saving || !amount}>
              {saving ? 'Saving…' : 'Save expense'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
