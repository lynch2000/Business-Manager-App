import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { db } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import type { ServiceRecord } from '../../types'
import { Card, EmptyState, PageHeader, Spinner, Button, StatusBadge } from '../../components/ui'
import { BackIcon, PlusIcon } from '../../components/Icons'
import { formatDate } from '../../lib/currency'
import { dueStatus } from '../../lib/serviceDue'

export default function ServiceReminders() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    db
      .from('service_records')
      .select('*, customer:customers(*)')
      .eq('user_id', user.id)
      .order('next_due_date')
      .then(({ data }) => {
        setRecords((data as ServiceRecord[]) ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader
          title="Servicing"
          action={
            <Link to="/services/new">
              <Button className="!px-3"><PlusIcon width={18} height={18} /></Button>
            </Link>
          }
        />
      </div>

      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <EmptyState title="No service records" hint="Log a service to start tracking reminders." />
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const status = dueStatus(r.next_due_date)
            return (
              <Link key={r.id} to={`/customers/${r.customer_id}`}>
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{r.customer?.name}</p>
                    <p className="text-sm text-slate-500">{r.service_type}{r.equipment ? ` · ${r.equipment}` : ''}</p>
                    <p className="text-xs text-slate-400">Last serviced {formatDate(r.service_date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium text-slate-900">{formatDate(r.next_due_date)}</span>
                    <StatusBadge status={status} />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
