import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const sql = getDb();

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        guest_name TEXT NOT NULL,
        guest_email TEXT,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        nights INTEGER,
        total_price INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        swish_reference TEXT UNIQUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS blocked_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE UNIQUE NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (check_in, check_out)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates (date)`;

    return NextResponse.json({ success: true, message: 'Tables created' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
