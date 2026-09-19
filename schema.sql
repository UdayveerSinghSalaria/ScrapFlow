-- ============================================
-- ScrapFlow Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Buyers table
CREATE TABLE IF NOT EXISTS buyers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '—',
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Buyer rates (one row per material per buyer)
CREATE TABLE IF NOT EXISTS buyer_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  material TEXT NOT NULL CHECK (material IN ('Iron', 'Copper', 'Aluminium', 'Steel', 'Brass', 'Stainless Steel', 'Plastic', 'Mixed Scrap')),
  rate INTEGER NOT NULL CHECK (rate > 0),
  UNIQUE(buyer_id, material)
);

-- 3. Batches table
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY, -- SC2841 format
  created_at TIMESTAMPTZ DEFAULT now(),
  material TEXT NOT NULL CHECK (material IN ('Iron', 'Copper', 'Aluminium', 'Steel', 'Brass', 'Stainless Steel', 'Plastic', 'Mixed Scrap')),
  grade TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,
  value INTEGER NOT NULL CHECK (value >= 0),
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Delivered', 'In Transit', 'Scheduled')),
  factory TEXT NOT NULL DEFAULT 'Factory 1 – Ludhiana',
  notes TEXT
);

-- 4. Settings table (single row for demo)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL DEFAULT 'User',
  factory TEXT NOT NULL DEFAULT 'Factory 1 – Ludhiana',
  alerts BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  auto_route BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_batches_material ON batches(material);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created ON batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_rates_buyer ON buyer_rates(buyer_id);

-- ============================================
-- Seed Data
-- ============================================

-- Insert buyers
INSERT INTO buyers (id, name, state, rating, active) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Buyer A', 'Punjab', 4.6, true),
  ('b2222222-2222-2222-2222-222222222222', 'Buyer B', 'Haryana', 4.8, true),
  ('c3333333-3333-3333-3333-333333333333', 'Buyer C', 'Gujarat', 4.3, true),
  ('d4444444-4444-4444-4444-444444444444', 'Buyer D', 'Maharashtra', 4.5, true),
  ('e5555555-5555-5555-5555-555555555555', 'Buyer E', 'Delhi', 4.1, true),
  ('f6666666-6666-6666-6666-666666666666', 'Buyer F', 'Punjab', 3.9, false)
ON CONFLICT (id) DO NOTHING;

-- Insert buyer rates
INSERT INTO buyer_rates (buyer_id, material, rate) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Steel', 48),
  ('a1111111-1111-1111-1111-111111111111', 'Aluminium', 160),
  ('b2222222-2222-2222-2222-222222222222', 'Copper', 720),
  ('b2222222-2222-2222-2222-222222222222', 'Brass', 405),
  ('c3333333-3333-3333-3333-333333333333', 'Brass', 410),
  ('c3333333-3333-3333-3333-333333333333', 'Copper', 700),
  ('d4444444-4444-4444-4444-444444444444', 'Aluminium', 175),
  ('d4444444-4444-4444-4444-444444444444', 'Steel', 46),
  ('e5555555-5555-5555-5555-555555555555', 'Copper', 705),
  ('e5555555-5555-5555-5555-555555555555', 'Aluminium', 170),
  ('f6666666-6666-6666-6666-666666666666', 'Steel', 44),
  ('f6666666-6666-6666-6666-666666666666', 'Brass', 395)
ON CONFLICT DO NOTHING;

-- Insert sample batches
INSERT INTO batches (id, created_at, material, grade, quantity, buyer_id, value, status, factory, notes) VALUES
  ('SC2841', '2025-04-15T08:44:00Z', 'Copper', 'A', 180, 'b2222222-2222-2222-2222-222222222222', 129600, 'Delivered', 'Factory 1 – Ludhiana', NULL),
  ('SC2840', '2025-04-15T05:33:00Z', 'Aluminium', 'B', 320, 'd4444444-4444-4444-4444-444444444444', 56000, 'In Transit', 'Factory 1 – Ludhiana', NULL),
  ('SC2839', '2025-04-14T11:51:00Z', 'Steel', 'A', 500, 'a1111111-1111-1111-1111-111111111111', 24000, 'Scheduled', 'Factory 2 – Rajpura', NULL),
  ('SC2838', '2025-04-13T10:40:00Z', 'Brass', 'A', 90, 'c3333333-3333-3333-3333-333333333333', 36900, 'Delivered', 'Factory 1 – Ludhiana', NULL),
  ('SC2837', '2025-04-12T05:15:00Z', 'Copper', 'A', 120, 'b2222222-2222-2222-2222-222222222222', 86400, 'Delivered', 'Factory 1 – Ludhiana', NULL),
  ('SC2836', '2025-04-11T10:00:00Z', 'Aluminium', 'A', 210, 'd4444444-4444-4444-4444-444444444444', 36750, 'Delivered', 'Factory 3 – Mohali', NULL),
  ('SC2835', '2025-04-10T03:45:00Z', 'Steel', 'B', 400, 'a1111111-1111-1111-1111-111111111111', 19200, 'Delivered', 'Factory 2 – Rajpura', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert default settings
INSERT INTO settings (user_name, factory, alerts, email_notifications, auto_route) VALUES
  ('Sakshi', 'Factory 1 – Ludhiana', true, true, false)
ON CONFLICT DO NOTHING;

-- ============================================
-- Row Level Security (RLS) — disabled for demo
-- ============================================
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon role (demo only — tighten in production)
CREATE POLICY "Allow all for anon" ON buyers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON buyer_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON settings FOR ALL USING (true) WITH CHECK (true);
