import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Expense } from '../../types'
import { Button, Card, EmptyState, PageHeader, Spinner } from '../../components/ui'
import { BackIcon, PlusIcon, ReceiptIcon } from '../../components/Icons'
import { formatCurrency, formatDate, round2 } from '../../lib/currency'

export default function ExpenseList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })
      .then(async ({ data }) => {
        const rows = (data as Expense[]) ?? []
        setExpenses(rows)
        setLoading(false)

        const paths = rows.map((r) => r.receipt_path).filter((p): p is string => Boolean(p))
        if (paths.length) {
          const { data: signed } = await supabase.storage.from('receipts').createSignedUrls(paths, 3600)
          const map: Record<string, string> = {}
          signed?.forEach((s) => {
            if (s.signedUrl && s.path) map[s.path] = s.signedUrl
          })
          setThumbnails(map)
        }
      })
  }, [user])

  const now = new Date()
  const monthTotal = round2(
    expenses
      .filter((e) => {
        const d = new Date(e.expense_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, e) => sum + e.amount, 0),
  )

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader
          title="Expenses"
          action={
            <Link to="/expenses/new">
              <Button className="!px-3"><PlusIcon width={18} height={18} /></Button>
            </Link>
          }
        />
      </div>

      <Card className="mb-4 text-center">
        <p className="text-xs text-slate-400">This month</p>
        <p className="text-lg font-semibold text-slate-900">{formatCurrency(monthTotal)}</p>
      </Card>

      {loading ? (
        <Spinner />
      ) : expenses.length === 0 ? (
        <EmptyState title="No expenses yet" hint="Snap a photo of a receipt to log your first one." />
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <Link key={e.id} to={`/expenses/${e.id}`}>
              <Card className="flex items-center gap-3">
                {e.receipt_path && thumbnails[e.receipt_path] ? (
                  <img src={thumbnails[e.receipt_path]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <ReceiptIcon width={20} height={20} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{e.vendor}</p>
                  <p className="text-sm text-slate-500">{e.category} · {formatDate(e.expense_date)}</p>
                </div>
                <span className="font-medium text-slate-900">{formatCurrency(e.amount)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
