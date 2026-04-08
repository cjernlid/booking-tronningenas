import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendApprovalEmail, sendDenialEmail } from '@/lib/email';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const body = await req.json();
  const { status } = body;

  if (!['approved', 'denied'].includes(status)) {
    return NextResponse.json({ error: 'Status måste vara approved eller denied' }, { status: 400 });
  }

  try {
    const result = await sql`
      UPDATE bookings SET status = ${status} WHERE id = ${id} RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Bokning hittades inte' }, { status: 404 });
    }

    const data = result[0];

    if (status === 'approved') {
      sendApprovalEmail({
        guestName: data.guest_name,
        guestEmail: data.guest_email,
        checkIn: data.check_in,
        checkOut: data.check_out,
        nights: data.nights,
        totalPrice: data.total_price,
        swishReference: data.swish_reference,
      }).catch(console.error);
    } else if (status === 'denied') {
      sendDenialEmail({
        guestName: data.guest_name,
        guestEmail: data.guest_email,
        checkIn: data.check_in,
        checkOut: data.check_out,
      }).catch(console.error);
    }

    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();

  try {
    await sql`DELETE FROM bookings WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
