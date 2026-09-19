// Database types matching Supabase schema

export type MaterialCategory = 'Copper' | 'Aluminium' | 'Steel' | 'Brass' | 'Stainless Steel' | 'Plastic' | 'Mixed Scrap'
export type BatchStatus = 'Delivered' | 'In Transit' | 'Scheduled'
export type Factory = 'Factory 1 – Ludhiana' | 'Factory 2 – Rajpura' | 'Factory 3 – Mohali'

export interface Buyer {
  id: string
  name: string
  state: string
  rating: number
  active: boolean
  created_at: string
}

export interface BuyerRate {
  id: string
  buyer_id: string
  material: MaterialCategory
  rate: number // ₹ per kg
}

export interface Batch {
  id: string
  created_at: string
  material: MaterialCategory
  grade: string
  quantity: number // kg
  buyer_id: string | null
  value: number // total value in ₹
  status: BatchStatus
  factory: Factory
  notes: string | null
}

export interface Settings {
  id: string
  user_name: string
  factory: Factory
  alerts: boolean
  email_notifications: boolean
  auto_route: boolean
}

// Joined types (for queries with relations)
export interface BatchWithBuyer extends Batch {
  buyers: Buyer | null
}

export interface BuyerWithRates extends Buyer {
  buyer_rates: BuyerRate[]
}

// App-level types (derived from DB types)
export interface BatchDisplay extends Batch {
  buyerName: string
  buyerRates: Partial<Record<MaterialCategory, number>>
}

export interface BuyerDisplay extends Buyer {
  rates: Partial<Record<MaterialCategory, number>>
}
