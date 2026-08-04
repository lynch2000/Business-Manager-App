import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Customer } from '../../types'
import { Button, Field, Input, PageHeader, Spinner, Textarea } from '../../components/ui'
import { BackIcon } from '../../components/Icons'

const empty = {
  name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  county: '',
  eircode: '',
  notes: '',
}

export default function CustomerForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const c = data as Customer
          setForm({
            name: c.name,
            email: c.email ?? '',
            phone: c.phone ?? '',
            address_line1: c.address_line1 ?? '',
            address_line2: c.address_line2 ?? '',
            city: c.city ?? '',
            county: c.county ?? '',
            eircode: c.eircode ?? '',
            notes: c.notes ?? '',
          })
        }
        setLoading(false)
      })
  }, [id])

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    if (isEdit) {
      const { error } = await supabase.from('customers').update(form).eq('id', id)
      setSaving(false)
      if (!error) navigate(`/customers/${id}`)
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...form, user_id: user.id })
        .select('id')
        .single()
      setSaving(false)
      if (!error && data) navigate(`/customers/${data.id}`)
    }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title={isEdit ? 'Edit customer' : 'New customer'} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <Input required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} type="tel" />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" />
        </Field>
        <Field label="Address line 1">
          <Input value={form.address_line1} onChange={(e) => set('address_line1', e.target.value)} />
        </Field>
        <Field label="Address line 2">
          <Input value={form.address_line2} onChange={(e) => set('address_line2', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Town / City">
            <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="County">
            <Input value={form.county} onChange={(e) => set('county', e.target.value)} />
          </Field>
        </div>
        <Field label="Eircode">
          <Input value={form.eircode} onChange={(e) => set('eircode', e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save customer'}
        </Button>
      </form>
    </div>
  )
}
