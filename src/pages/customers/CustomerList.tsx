import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import type { Customer } from '../../types'
import { Card, EmptyState, PageHeader, Spinner, Button, Input } from '../../components/ui'
import { PlusIcon } from '../../components/Icons'

export default function CustomerList() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    db
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
      .then(({ data }) => {
        setCustomers((data as Customer[]) ?? [])
        setLoading(false)
      })
  }, [user])

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Customers"
        action={
          <Link to="/customers/new">
            <Button className="!px-3"><PlusIcon width={18} height={18} /></Button>
          </Link>
        }
      />

      <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No customers yet" hint="Add your first customer to get started." />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link key={c.id} to={`/customers/${c.id}`}>
              <Card interactive className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.phone || c.email || 'No contact info'}</p>
                </div>
                <span className="text-slate-300">›</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
