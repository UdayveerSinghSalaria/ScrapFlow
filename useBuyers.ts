import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Buyer, BuyerRate, MaterialCategory } from '../types/database'

export interface BuyerWithRates extends Buyer {
  rates: Partial<Record<MaterialCategory, number>>
}

export function useBuyers() {
  const [buyers, setBuyers] = useState<BuyerWithRates[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBuyers = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Fetch buyers
    const { data: buyersData, error: buyersErr } = await supabase
      .from('buyers')
      .select('*')
      .order('name')

    if (buyersErr) {
      setError(buyersErr.message)
      setLoading(false)
      return
    }

    // Fetch all rates
    const { data: ratesData, error: ratesErr } = await supabase
      .from('buyer_rates')
      .select('*')

    if (ratesErr) {
      setError(ratesErr.message)
      setLoading(false)
      return
    }

    // Merge rates into buyers
    const buyersWithRates: BuyerWithRates[] = (buyersData || []).map((b) => {
      const rates: Partial<Record<MaterialCategory, number>> = {}
      ;(ratesData || [])
        .filter((r) => r.buyer_id === b.id)
        .forEach((r) => {
          rates[r.material as MaterialCategory] = r.rate
        })
      return { ...b, rates }
    })

    setBuyers(buyersWithRates)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBuyers()
  }, [fetchBuyers])

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel('buyers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buyers' }, () => {
        fetchBuyers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buyer_rates' }, () => {
        fetchBuyers()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchBuyers])

  // Add buyer with rate
  const addBuyer = useCallback(async (data: {
    name: string
    state: string
    material: MaterialCategory
    rate: number
  }) => {
    // Insert buyer
    const { data: newBuyer, error: buyerErr } = await supabase
      .from('buyers')
      .insert({ name: data.name, state: data.state, rating: 4.0, active: true })
      .select()
      .single()

    if (buyerErr) throw buyerErr

    // Insert rate
    const { error: rateErr } = await supabase
      .from('buyer_rates')
      .insert({ buyer_id: newBuyer.id, material: data.material, rate: data.rate })

    if (rateErr) throw rateErr

    await fetchBuyers()
  }, [fetchBuyers])

  // Toggle buyer active status
  const toggleBuyer = useCallback(async (id: string, active: boolean) => {
    const { error: err } = await supabase
      .from('buyers')
      .update({ active })
      .eq('id', id)
    if (err) throw err
    await fetchBuyers()
  }, [fetchBuyers])

  // Find best buyer for a material
  const bestBuyer = useCallback((material: MaterialCategory): BuyerWithRates | null => {
    const eligible = buyers.filter((b) => b.active && b.rates[material])
    if (!eligible.length) return null
    return eligible.reduce((best, b) =>
      (b.rates[material] || 0) > (best.rates[material] || 0) ? b : best
    )
  }, [buyers])

  return { buyers, loading, error, addBuyer, toggleBuyer, bestBuyer, refetch: fetchBuyers }
}
