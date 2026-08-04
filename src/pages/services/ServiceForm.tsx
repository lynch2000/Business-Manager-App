import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { db } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import { Button, Field, Input, PageHeader, Select, Textarea } from '../../components/ui'
import { BackIcon } from '../../components/Icons'
import CustomerSelect from '../../components/CustomerSelect'

export default function ServiceForm() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState(searchParams.get('customer') ?? '')
  const [serviceType, setServiceType] = useState('Annual Service')
  const [equipment, setEquipment] = useState('')
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [intervalMonths, setIntervalMonths] = useState(12)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !customerId) return
    setSaving(true)

    const nextDue = new Date(serviceDate)
    nextDue.setMonth(nextDue.getMonth() + intervalMonths)

    const { error } = await db.from('service_records').insert({
      user_id: user.id,
      customer_id: customerId,
      service_type: serviceType,
      equipment: equipment || null,
      service_date: serviceDate,
      interval_months: intervalMonths,
      next_due_date: nextDue.toISOString().slice(0, 10),
      notes: notes || null,
    })

    setSaving(false)
    if (!error) navigate(`/customers/${customerId}`)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title="Log a service" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <CustomerSelect value={customerId} onChange={setCustomerId} />

        <Field label="Service type">
          <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option>Annual Service</option>
            <option>Installation</option>
            <option>Repair</option>
            <option>Callout</option>
            <option>Other</option>
          </Select>
        </Field>

        <Field label="Equipment (e.g. heat pump model)">
          <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Service date">
            <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
          </Field>
          <Field label="Remind again in (months)">
            <Input type="number" min={1} value={intervalMonths} onChange={(e) => setIntervalMonths(Number(e.target.value))} />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Button type="submit" className="w-full" disabled={saving || !customerId}>
          {saving ? 'Saving…' : 'Save service record'}
        </Button>
      </form>
    </div>
  )
}
