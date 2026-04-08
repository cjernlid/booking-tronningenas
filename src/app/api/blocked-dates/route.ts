import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const sql = getDb();

  try {
    const data = await sql`
      SELECT * FROM blocked_dates ORDER BY date ASC
    `;
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { dates, reason } = body;

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: 'Ange minst ett datum' }, { status: 400 });
  }

  try {
    const results = [];
    for (const date of dates) {
      const result = await sql`
        INSERT INTO blocked_dates (date, reason)
        VALUES (${date}, ${reason || null})
        ON CONFLICT (date) DO UPDATE SET reason = ${reason || null}
        RETURNING *
      `;
      results.push(result[0]);
    }
    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Ange datum att avblockera' }, { status: 400 });
  }

  try {
    await sql`DELETE FROM blocked_dates WHERE date = ${date}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
