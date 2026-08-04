import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/db'
import { useAuth } from '../context/AuthContext'
import type { BusinessSettings } from '../types'

export function useBusinessSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await db.from('business_settings').select('*').eq('user_id', user.id).maybeSingle()

    if (!error && data) {
      setSettings(data as BusinessSettings)
    } else if (!error && !data) {
      const { data: created } = await db
        .from('business_settings')
        .insert({ user_id: user.id, business_name: 'Lynch Heating & Cooling' })
        .select('*')
        .single()
      setSettings(created as BusinessSettings)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function save(patch: Partial<BusinessSettings>) {
    if (!settings) return
    const { data, error } = await db
      .from('business_settings')
      .update(patch)
      .eq('id', settings.id)
      .select('*')
      .single()
    if (!error && data) setSettings(data as BusinessSettings)
    return { error }
  }

  return { settings, loading, save, refresh }
}
