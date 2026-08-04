import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Invoice } from '../../types'
import { Card, EmptyState, PageHeader, Spinner, Button, StatusBadge } from '../../components/ui'
import { PlusIcon } from '../../components/Icons'
import { formatCurrency, formatDate } from '../../lib/currency'

export default function InvoiceList() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices((data as Invoice[]) ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <div>
      <PageHeader
        title="Invoices"
        action={
          <Link to="/invoices/new">
            <Button className="!px-3"><PlusIcon width={18} height={18} /></Button>
          </Link>
        }
      />

      {loading ? (
        <Spinner />
      ) : invoices.length === 0 ? (
        <EmptyState title="No invoices yet" hint="Create an invoice to bill a customer." />
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Link key={inv.id} to={`/invoices/${inv.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{inv.invoice_number}</p>
                  <p className="text-sm text-slate-500">
                    {inv.customer?.name} · Due {formatDate(inv.due_date)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-medium text-slate-900">{formatCurrency(inv.total)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
