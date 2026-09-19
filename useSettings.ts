import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Settings, Factory } from '../types/database'

const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  user_name: 'Sakshi',
  factory: 'Factory 1 – Ludhiana',
  alerts: true,
  email_notifications: true,
  auto_route: false,
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .single()

    if (err || !data) {
      // If no settings exist, create default
      if (err?.code === 'PGRST116') {
        const { data: created, error: createErr } = await supabase
          .from('settings')
          .insert(DEFAULT_SETTINGS)
          .select()
          .single()
        if (createErr) {
          setError(createErr.message)
          setSettings({ id: 'local', ...DEFAULT_SETTINGS })
        } else {
          setSettings(created)
        }
      } else {
        setError(err?.message || 'Settings not found')
        setSettings({ id: 'local', ...DEFAULT_SETTINGS })
      }
    } else {
      setSettings(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchSettings])

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<Pick<Settings, 'user_name' | 'factory' | 'alerts' | 'email_notifications' | 'auto_route'>>) => {
    if (!settings) return
    const { error: err } = await supabase
      .from('settings')
      .update(updates)
      .eq('id', settings.id)
    if (err) throw err
    await fetchSettings()
  }, [settings, fetchSettings])

  return { settings, loading, error, updateSettings, refetch: fetchSettings }
}
