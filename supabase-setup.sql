-- Run this in Supabase SQL Editor to create the tables

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  swish_reference TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates (date);

-- RLS policies (using service role key bypasses these, but good practice)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- Allow public read for available dates check
CREATE POLICY "Public can read bookings for calendar" ON bookings
  FOR SELECT USING (true);

CREATE POLICY "Public can read blocked dates" ON blocked_dates
  FOR SELECT USING (true);

-- Only service role can insert/update/delete (our API routes use service key)
CREATE POLICY "Service can manage bookings" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage blocked dates" ON blocked_dates
  FOR ALL USING (auth.role() = 'service_role');
