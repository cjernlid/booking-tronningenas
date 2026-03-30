import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendApprovalEmail, sendDenialEmail } from '@/lib/email';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getServiceClient();
  const body = await req.json();
  const { status } = body;

  if (!['approved', 'denied'].includes(status)) {
    return NextResponse.json({ error: 'Status måste vara approved eller denied' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
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
  }

  return NextResponse.json(data);
}
