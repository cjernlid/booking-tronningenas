import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);
}

export async function sendBookingNotification({
  guestName,
  checkIn,
  checkOut,
  nights,
  totalPrice,
  swishReference,
  notes,
}: {
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  swishReference: string;
  notes?: string;
}) {
  const resend = getResend();
  const adminEmails = getAdminEmails();
  if (!resend || adminEmails.length === 0) return;

  const fromDate = formatDate(checkIn);
  const toDate = formatDate(checkOut);

  await resend.emails.send({
    from: 'Viekärrsvägen 4 <onboarding@resend.dev>',
    to: adminEmails,
    subject: `Ny bokning: ${guestName} (${fromDate} - ${toDate})`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F5F0EB; border-radius: 16px;">
        <h2 style="color: #2D3436; margin: 0 0 4px;">Ny bokningsforfragan</h2>
        <div style="width: 48px; height: 2px; background: #D4A574; margin-bottom: 24px;"></div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #2D3436;">
          <tr>
            <td style="padding: 8px 0; color: #636E72; width: 120px;">Gast</td>
            <td style="padding: 8px 0; font-weight: 600;">${guestName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Incheckning</td>
            <td style="padding: 8px 0;">${fromDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Utcheckning</td>
            <td style="padding: 8px 0;">${toDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Natter</td>
            <td style="padding: 8px 0;">${nights}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Summa</td>
            <td style="padding: 8px 0; font-weight: 600;">${totalPrice.toLocaleString('sv-SE')} kr</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Swish-ref</td>
            <td style="padding: 8px 0; font-family: monospace; font-weight: 600;">${swishReference}</td>
          </tr>
          ${notes ? `
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Meddelande</td>
            <td style="padding: 8px 0; font-style: italic;">${notes}</td>
          </tr>
          ` : ''}
        </table>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E8E0D8;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://booking-tronningenas.vercel.app'}/admin"
             style="display: inline-block; background: #D4A574; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Oppna admin-panelen
          </a>
        </div>
      </div>
    `,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
}
