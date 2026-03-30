import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { generateSwishReference } from '@/lib/swish-ref';

const PRICE_PER_NIGHT = 800;

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('check_in', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();
  const { guest_name, guest_email, check_in, check_out, notes } = body;

  if (!guest_name || !check_in || !check_out) {
    return NextResponse.json({ error: 'Namn, incheckning och utcheckning krävs' }, { status: 400 });
  }

  // Calculate nights
  const start = new Date(check_in);
  const end = new Date(check_out);
  const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (nights < 1) {
    return NextResponse.json({ error: 'Utcheckning måste vara efter incheckning' }, { status: 400 });
  }

  // Check for date conflicts (existing approved/pending bookings)
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .neq('status', 'denied')
    .lt('check_in', check_out)
    .gt('check_out', check_in);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'En eller flera av datumen är redan bokade' }, { status: 409 });
  }

  // Check for blocked dates
  const dates: string[] = [];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('date')
    .in('date', dates);

  if (blocked && blocked.length > 0) {
    return NextResponse.json({ error: 'En eller flera av datumen är blockerade' }, { status: 409 });
  }

  const swish_reference = generateSwishReference(check_in, check_out);

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      guest_name,
      guest_email: guest_email || null,
      check_in,
      check_out,
      nights,
      total_price: nights * PRICE_PER_NIGHT,
      status: 'pending',
      swish_reference,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // TODO: Send email notification to admins

  return NextResponse.json(data, { status: 201 });
}
