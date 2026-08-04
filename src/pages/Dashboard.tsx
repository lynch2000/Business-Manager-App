import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import type { Expense, Invoice, ServiceRecord } from '../types'
import { Card, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { formatCurrency, formatDate, round2 } from '../lib/currency'
import { dueStatus } from '../lib/serviceDue'
import { BellIcon, AccountsIcon, ReceiptIcon } from '../components/Icons'

export default function Dashboard() {
  const { user } = useAuth()
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([])
  const [dueServices, setDueServices] = useState<ServiceRecord[]>([])
  const [monthExpenseTotal, setMonthExpenseTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    Promise.all([
      db
        .from('invoices')
        .select('*, customer:customers(*)')
        .eq('user_id', user.id)
        .in('status', ['sent', 'partially_paid', 'overdue', 'draft'])
        .order('due_date'),
      db
        .from('service_records')
        .select('*, customer:customers(*)')
        .eq('user_id', user.id)
        .lte('next_due_date', in30Days.toISOString().slice(0, 10))
        .order('next_due_date'),
      db
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('expense_date', monthStart),
    ]).then(([inv, svc, exp]) => {
      setOutstandingInvoices((((inv.data as Invoice[]) ?? []).filter((i) => i.total - i.amount_paid > 0)).slice(0, 5))
      setDueServices(((svc.data as ServiceRecord[]) ?? []).slice(0, 5))
      setMonthExpenseTotal(round2(((exp.data as Pick<Expense, 'amount'>[]) ?? []).reduce((sum, e) => sum + e.amount, 0)))
      setLoading(false)
    })
  }, [user])

  const totalOwed = round2(outstandingInvoices.reduce((sum, i) => sum + (i.total - i.amount_paid), 0))

  return (
    <div>
      <PageHeader title="Dashboard" />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Link to="/accounts">
              <Card interactive className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <AccountsIcon width={20} height={20} />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Outstanding</p>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(totalOwed)}</p>
                </div>
              </Card>
            </Link>
            <Link to="/expenses">
              <Card interactive className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <ReceiptIcon width={20} height={20} />
                </span>
                <div>
                  <p className="text-sm text-slate-500">Expenses (mth)</p>
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(monthExpenseTotal)}</p>
                </div>
              </Card>
            </Link>
          </div>

          <Section title="Servicing due soon" icon={<BellIcon width={18} height={18} className="text-brand-600" />}>
            {dueServices.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing due in the next 30 days.</p>
            ) : (
              dueServices.map((s) => (
                <Link key={s.id} to={`/customers/${s.customer_id}`} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{s.customer?.name}</p>
                    <p className="text-slate-400">{s.service_type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-slate-700">{formatDate(s.next_due_date)}</span>
                    <StatusBadge status={dueStatus(s.next_due_date)} />
                  </div>
                </Link>
              ))
            )}
            <Link to="/services" className="mt-2 inline-block text-sm text-brand-600">View all servicing →</Link>
          </Section>

          <Section title="Unpaid invoices">
            {outstandingInvoices.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing outstanding — nice work.</p>
            ) : (
              outstandingInvoices.map((inv) => (
                <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium text-slate-800">{inv.customer?.name}</p>
                    <p className="text-slate-400">{inv.invoice_number}</p>
                  </div>
                  <span className="font-medium text-slate-800">{formatCurrency(inv.total - inv.amount_paid)}</span>
                </Link>
              ))
            )}
            <Link to="/accounts" className="mt-2 inline-block text-sm text-brand-600">View accounts →</Link>
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {title}
      </h2>
      {children}
    </Card>
  )
}
