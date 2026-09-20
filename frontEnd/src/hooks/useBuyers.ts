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

    console.log('[Supabase] Fetching buyers...')

    // Fetch buyers
    const { data: buyersData, error: buyersErr } = await supabase
      .from('buyers')
      .select('*')
      .order('name')

    if (buyersErr) {
      console.error('[Supabase] Buyers fetch error:', buyersErr)
      setError(buyersErr.message)
      setLoading(false)
      return
    }

    console.log('[Supabase] Buyers raw:', buyersData?.length, 'rows', buyersData)

    // Fetch all rates
    const { data: ratesData, error: ratesErr } = await supabase
      .from('buyer_rates')
      .select('*')

    if (ratesErr) {
      console.error('[Supabase] Rates fetch error:', ratesErr)
      setError(ratesErr.message)
      setLoading(false)
      return
    }

    console.log('[Supabase] Rates raw:', ratesData?.length, 'rows')

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

    console.log('[Supabase] Buyers with rates:', buyersWithRates.length)
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
    phone?: string
    email?: string
  }) => {
    // Insert buyer
    const { data: newBuyer, error: buyerErr } = await supabase
      .from('buyers')
      .insert({ name: data.name, state: data.state, rating: 4.0, active: true, phone: data.phone || null, email: data.email || null })
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

  // Update local state AND sync changes to Supabase
  const setBuyersAndSync = useCallback(async (newBuyers: BuyerWithRates[] | ((prev: BuyerWithRates[]) => BuyerWithRates[])) => {
    const updated = typeof newBuyers === 'function' ? newBuyers(buyers) : newBuyers;
    console.log('[Sync] setBuyersAndSync called. Old:', buyers.length, 'New:', updated.length);
    
    // Detect changes
    const oldMap = new Map(buyers.map(b => [b.name, b]));
    const newMap = new Map(updated.map(b => [b.name, b]));
    
    // Find updated buyers (active toggle, contact changes)
    for (const [name, newBuyer] of newMap) {
      const oldBuyer = oldMap.get(name);
      if (oldBuyer) {
        // Existing buyer — check for changes
        if (oldBuyer.active !== newBuyer.active) {
          console.log('[Sync] Active toggle:', name, oldBuyer.active, '->', newBuyer.active);
          const { error } = await supabase.from('buyers').update({ active: newBuyer.active }).eq('name', name);
          if (error) console.error('[Sync] Active update error:', error);
        }
        if (oldBuyer.phone !== newBuyer.phone || oldBuyer.email !== newBuyer.email) {
          console.log('[Sync] Contact update:', name);
          const { error } = await supabase.from('buyers').update({ phone: newBuyer.phone || null, email: newBuyer.email || null }).eq('name', name);
          if (error) console.error('[Sync] Contact update error:', error);
        }
      } else {
        // New buyer — insert into DB
        console.log('[Sync] New buyer:', name);
        const { data: inserted, error: insertErr } = await supabase
          .from('buyers')
          .insert({ name: newBuyer.name, state: newBuyer.state, rating: newBuyer.rating, active: newBuyer.active, phone: newBuyer.phone || null, email: newBuyer.email || null })
          .select()
          .single();
        
        if (insertErr) {
          console.error('[Sync] New buyer insert error:', insertErr);
        } else if (inserted) {
          // Insert rates for the new buyer
          for (const [material, rate] of Object.entries(newBuyer.rates)) {
            if (rate) {
              const { error: rateErr } = await supabase.from('buyer_rates').insert({ buyer_id: inserted.id, material, rate });
              if (rateErr) console.error('[Sync] Rate insert error:', rateErr);
            }
          }
        }
      }
    }
    
    // Refetch to get complete data
    console.log('[Sync] Refetching buyers...');
    await fetchBuyers();
  }, [buyers, fetchBuyers]);

  return { buyers, loading, error, addBuyer, toggleBuyer, bestBuyer, setBuyersAndSync, refetch: fetchBuyers }
}
