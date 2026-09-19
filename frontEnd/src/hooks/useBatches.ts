import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Batch, BatchStatus, MaterialCategory } from '../types/database'

// Generate next batch ID
function nextBatchId(existingBatches: Batch[]): string {
  const maxNum = existingBatches.reduce((max, b) => {
    const num = parseInt(b.id.replace('SC', ''), 10)
    return num > max ? num : max
  }, 0)
  return `SC${maxNum + 1}`
}

export function useBatches() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all batches
  const fetchBatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
      setBatches([])
    } else {
      setBatches(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('batches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, () => {
        fetchBatches()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchBatches])

  // Add a batch
  const addBatch = useCallback(async (batch: {
    material: MaterialCategory
    grade: string
    quantity: number
    buyer_id: string | null
    value: number
    factory?: string
    notes?: string
  }) => {
    const id = nextBatchId(batches)
    const { error: err } = await supabase.from('batches').insert({
      id,
      material: batch.material,
      grade: batch.grade,
      quantity: batch.quantity,
      buyer_id: batch.buyer_id,
      value: batch.value,
      status: 'Scheduled',
      factory: batch.factory || 'Factory 1 – Ludhiana',
      notes: batch.notes || null,
    })
    if (err) throw err
    await fetchBatches()
    return id
  }, [batches, fetchBatches])

  // Update batch status
  const updateBatchStatus = useCallback(async (id: string, status: BatchStatus) => {
    const { error: err } = await supabase.from('batches').update({ status }).eq('id', id)
    if (err) throw err
    await fetchBatches()
  }, [fetchBatches])

  // Delete a batch
  const deleteBatch = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('batches').delete().eq('id', id)
    if (err) throw err
    await fetchBatches()
  }, [fetchBatches])

  // Add multiple batches (from scan result)
  const addBatchBulk = useCallback(async (rows: {
    material: MaterialCategory
    grade: string
    quantity: number
    buyer_id: string | null
    value: number
  }[]) => {
    const baseId = batches.reduce((max, b) => {
      const num = parseInt(b.id.replace('SC', ''), 10)
      return num > max ? num : max
    }, 0)
    const now = new Date().toISOString()
    const inserts = rows.map((r, i) => ({
      id: `SC${baseId + i + 1}`,
      material: r.material,
      grade: r.grade,
      quantity: r.quantity,
      buyer_id: r.buyer_id,
      value: r.value,
      status: 'Scheduled' as const,
      factory: 'Factory 1 – Ludhiana',
      notes: null,
      created_at: now,
    }))
    const { error: err } = await supabase.from('batches').insert(inserts)
    if (err) throw err
    await fetchBatches()
  }, [batches, fetchBatches])

  return { batches, loading, error, addBatch, addBatchBulk, updateBatchStatus, deleteBatch, refetch: fetchBatches }
}
