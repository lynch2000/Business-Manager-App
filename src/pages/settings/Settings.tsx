import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import { Button, Field, Input, PageHeader, Spinner } from '../../components/ui'
import { BackIcon } from '../../components/Icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  const navigate = useNavigate()
  const { settings, loading, save } = useBusinessSettings()
  const { signOut } = useAuth()
  const [form, setForm] = useState<Record<string, string | number>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm({
        business_name: settings.business_name ?? '',
        owner_name: settings.owner_name ?? '',
        address: settings.address ?? '',
        phone: settings.phone ?? '',
        email: settings.email ?? '',
        vat_number: settings.vat_number ?? '',
        default_vat_rate: settings.default_vat_rate ?? 23,
        account_name: settings.account_name ?? '',
        bank_name: settings.bank_name ?? '',
        iban: settings.iban ?? '',
        bic: settings.bic ?? '',
        quote_prefix: settings.quote_prefix ?? 'Q-',
        invoice_prefix: settings.invoice_prefix ?? 'INV-',
      })
    }
  }, [settings])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await save({ ...form, default_vat_rate: Number(form.default_vat_rate) })
    setSaving(false)
    setSaved(true)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !settings) return
    setLogoUploading(true)
    const path = `${settings.user_id}/logo-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      await save({ logo_url: data.publicUrl })
    }
    setLogoUploading(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-slate-500">
          <BackIcon />
        </button>
        <PageHeader title="Business settings" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Business name">
          <Input value={form.business_name ?? ''} onChange={(e) => set('business_name', e.target.value)} />
        </Field>
        <Field label="Owner name">
          <Input value={form.owner_name ?? ''} onChange={(e) => set('owner_name', e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
        </div>
        <Field label="VAT number">
          <Input value={form.vat_number ?? ''} onChange={(e) => set('vat_number', e.target.value)} />
        </Field>
        <Field label="Default VAT rate (%)">
          <Input
            type="number"
            step="0.01"
            value={form.default_vat_rate ?? 23}
            onChange={(e) => set('default_vat_rate', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quote number prefix">
            <Input value={form.quote_prefix ?? ''} onChange={(e) => set('quote_prefix', e.target.value)} />
          </Field>
          <Field label="Invoice number prefix">
            <Input value={form.invoice_prefix ?? ''} onChange={(e) => set('invoice_prefix', e.target.value)} />
          </Field>
        </div>

        <Field label="Logo">
          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
          {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="mt-2 h-16 rounded-lg border border-slate-200" />}
        </Field>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Bank details</h2>
          <p className="mb-3 text-xs text-slate-400">
            Shown on invoices and sent to customers via "Send bank details".
          </p>
          <div className="space-y-4">
            <Field label="Account name">
              <Input value={form.account_name ?? ''} onChange={(e) => set('account_name', e.target.value)} />
            </Field>
            <Field label="Bank name">
              <Input value={form.bank_name ?? ''} onChange={(e) => set('bank_name', e.target.value)} />
            </Field>
            <Field label="IBAN">
              <Input value={form.iban ?? ''} onChange={(e) => set('iban', e.target.value)} />
            </Field>
            <Field label="BIC">
              <Input value={form.bic ?? ''} onChange={(e) => set('bic', e.target.value)} />
            </Field>
          </div>
        </div>

        {saved && <p className="text-sm text-green-600">Saved.</p>}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>

        <Button type="button" variant="secondary" className="w-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </form>
    </div>
  )
}
