import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import type { Quote } from '../../types'
import { Card, EmptyState, PageHeader, Spinner, Button, StatusBadge } from '../../components/ui'
import { PlusIcon } from '../../components/Icons'
import { formatCurrency, formatDate } from '../../lib/currency'

export default function QuoteList() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    db
      .from('quotes')
      .select('*, customer:customers(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuotes((data as Quote[]) ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <div>
      <PageHeader
        title="Quotes"
        action={
          <Link to="/quotes/new">
            <Button className="!px-3"><PlusIcon width={18} height={18} /></Button>
          </Link>
        }
      />

      {loading ? (
        <Spinner />
      ) : quotes.length === 0 ? (
        <EmptyState title="No quotes yet" hint="Create a quotation to send to a customer." />
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <Link key={q.id} to={`/quotes/${q.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{q.quote_number}</p>
                  <p className="text-sm text-slate-500">{q.customer?.name} · {formatDate(q.issue_date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-medium text-slate-900">{formatCurrency(q.total)}</span>
                  <StatusBadge status={q.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
