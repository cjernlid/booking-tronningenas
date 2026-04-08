import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateSwishReference } from '@/lib/swish-ref';
import { sendBookingNotification } from '@/lib/email';

const PRICE_PER_NIGHT = 800;

export async function GET() {
  const sql = getDb();

  try {
    const data = await sql`
      SELECT * FROM bookings ORDER BY check_in ASC
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
  const { guest_name, guest_email, check_in, check_out, notes } = body;

  if (!guest_name || !check_in || !check_out) {
    return NextResponse.json({ error: 'Namn, incheckning och utcheckning krävs' }, { status: 400 });
  }

  const start = new Date(check_in);
  const end = new Date(check_out);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (nights < 1) {
    return NextResponse.json({ error: 'Utcheckning måste vara efter incheckning' }, { status: 400 });
  }

  try {
    // Check for date conflicts
    const conflicts = await sql`
      SELECT id FROM bookings
      WHERE status != 'denied'
        AND check_in < ${check_out}
        AND check_out > ${check_in}
    `;

    if (conflicts.length > 0) {
      return NextResponse.json({ error: 'En eller flera av datumen är redan bokade' }, { status: 409 });
    }

    // Check for blocked dates
    const dates: string[] = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const blocked = await sql`
      SELECT date FROM blocked_dates WHERE date = ANY(${dates})
    `;

    if (blocked.length > 0) {
      return NextResponse.json({ error: 'En eller flera av datumen är blockerade' }, { status: 409 });
    }

    const swish_reference = generateSwishReference(check_in, check_out);
    const total_price = nights * PRICE_PER_NIGHT;

    const result = await sql`
      INSERT INTO bookings (guest_name, guest_email, check_in, check_out, nights, total_price, status, swish_reference, notes)
      VALUES (${guest_name}, ${guest_email || null}, ${check_in}, ${check_out}, ${nights}, ${total_price}, 'pending', ${swish_reference}, ${notes || null})
      RETURNING *
    `;

    const data = result[0];

    // Send email notification to admins (fire and forget)
    sendBookingNotification({
      guestName: guest_name,
      checkIn: check_in,
      checkOut: check_out,
      nights,
      totalPrice: total_price,
      swishReference: swish_reference,
      notes,
    }).catch(() => {});

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
