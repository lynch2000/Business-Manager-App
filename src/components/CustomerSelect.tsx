import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { db } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import type { Customer } from '../types'
import { Field, Select } from './ui'

export default function CustomerSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (customerId: string) => void
}) {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    if (!user) return
    db
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
      .then(({ data }) => setCustomers((data as Customer[]) ?? []))
  }, [user])

  return (
    <Field label="Customer">
      <Select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Select a customer…</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Link to="/customers/new" className="mt-1 inline-block text-xs text-brand-600">
        + Add new customer
      </Link>
    </Field>
  )
}
