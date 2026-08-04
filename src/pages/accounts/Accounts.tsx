import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { db } from '../../lib/db'
import { storage } from '../../lib/storage'
import { useAuth } from '../../context/AuthContext'
import type { Creditor, Invoice } from '../../types'
import { Button, Card, EmptyState, Field, Input, PageHeader, Spinner, StatusBadge, Textarea } from '../../components/ui'
import { BackIcon, CameraIcon, PlusIcon, ReceiptIcon } from '../../components/Icons'
import { formatCurrency, formatDate, round2 } from '../../lib/currency'

export default function Accounts() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<'debtors' | 'creditors'>('debtors')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [creditors, setCreditors] = useState<Creditor[]>([])
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showCreditorForm, setShowCreditorForm] = useState(false)

  async function load() {
    if (!user) return
    const [inv, cr] = await Promise.all([
      db
        .from('invoices')
        .select('*, customer:customers(*)')
        .eq('user_id', user.id)
        .in('status', ['sent', 'partially_paid', 'overdue', 'draft'])
        .order('due_date'),
      db.from('creditors').select('*').eq('user_id', user.id).order('due_date'),
    ])
    setInvoices(((inv.data as Invoice[]) ?? []).filter((i) => i.total - i.amount_paid > 0))
    const creditorRows = (cr.data as Creditor[]) ?? []
    setCreditors(creditorRows)
    setLoading(false)

    const paths = creditorRows.map((c) => c.receipt_path).filter((p): p is string => Boolean(p))
    if (paths.length) {
      const { data: signed } = await storage.from('receipts').createSignedUrls(paths, 3600)
      const map: Record<string, string> = {}
      signed?.forEach((s) => {
        if (s.signedUrl && s.path) map[s.path] = s.signedUrl
      })
      setReceiptUrls(map)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const totalOwedToMe = round2(invoices.reduce((sum, i) => sum + (i.total - i.amount_paid), 0))
  const totalIOwe = round2(creditors.filter((c) => c.status === 'unpaid').reduce((sum, c) => sum + c.amount, 0))

  async function markCreditorPaid(id: string) {
    await db.from('creditors').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', id)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title="Accounts" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-xs text-slate-400">Owed to you</p>
          <p className="text-lg font-semibold text-green-600">{formatCurrency(totalOwedToMe)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-slate-400">You owe</p>
          <p className="text-lg font-semibold text-red-600">{formatCurrency(totalIOwe)}</p>
        </Card>
      </div>

      <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab('debtors')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === 'debtors' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
        >
          Debtors
        </button>
        <button
          onClick={() => setTab('creditors')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === 'creditors' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
        >
          Creditors
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'debtors' ? (
        invoices.length === 0 ? (
          <EmptyState title="No outstanding invoices" />
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Link key={inv.id} to={`/invoices/${inv.id}`}>
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{inv.customer?.name}</p>
                    <p className="text-sm text-slate-500">{inv.invoice_number} · Due {formatDate(inv.due_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-medium text-slate-900">{formatCurrency(inv.total - inv.amount_paid)}</span>
                    <StatusBadge status={inv.due_date && new Date(inv.due_date) < new Date() ? 'overdue' : inv.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setShowCreditorForm((s) => !s)}>
              <PlusIcon width={16} height={16} /> Add manually
            </Button>
            <Link to="/expenses/new?owed=1">
              <Button variant="secondary" className="w-full">
                <CameraIcon width={16} height={16} /> Scan a docket
              </Button>
            </Link>
          </div>

          {showCreditorForm && (
            <CreditorForm
              userId={user!.id}
              onSaved={() => {
                setShowCreditorForm(false)
                load()
              }}
            />
          )}

          {creditors.length === 0 ? (
            <EmptyState title="No creditors recorded" hint="Track bills you owe to suppliers." />
          ) : (
            <div className="space-y-2">
              {creditors.map((c) => (
                <Card key={c.id} className="flex items-center gap-3">
                  {c.receipt_path && receiptUrls[c.receipt_path] ? (
                    <a href={receiptUrls[c.receipt_path]} target="_blank" rel="noreferrer" className="shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <ReceiptIcon width={18} height={18} />
                      </div>
                    </a>
                  ) : null}
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{c.supplier_name}</p>
                    <p className="text-sm text-slate-500">{c.description || 'No description'} · Due {formatDate(c.due_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-medium text-slate-900">{formatCurrency(c.amount)}</span>
                    {c.status === 'unpaid' ? (
                      <button onClick={() => markCreditorPaid(c.id)} className="text-xs text-brand-600">
                        Mark paid
                      </button>
                    ) : (
                      <StatusBadge status="paid" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CreditorForm({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [supplierName, setSupplierName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supplierName || !amount) return
    setSaving(true)
    await db.from('creditors').insert({
      user_id: userId,
      supplier_name: supplierName,
      description: description || null,
      amount: Number(amount),
      due_date: dueDate || null,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Card className="mb-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Supplier">
          <Input required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <Input type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </Card>
  )
}
