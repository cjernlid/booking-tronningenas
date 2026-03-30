import { Resend } from 'resend';
import { SWISH_QR_BASE64 } from './swish-qr';

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

export async function sendApprovalEmail({
  guestName,
  guestEmail,
  checkIn,
  checkOut,
  nights,
  totalPrice,
  swishReference,
}: {
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  swishReference: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const fromDate = formatDate(checkIn);
  const toDate = formatDate(checkOut);

  await resend.emails.send({
    from: 'Viekärrsvägen 4 <onboarding@resend.dev>',
    to: [guestEmail],
    subject: `Bokning godkänd: ${fromDate} - ${toDate}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F5F0EB; border-radius: 16px;">
        <h2 style="color: #2D3436; margin: 0 0 4px;">Din bokning är godkänd!</h2>
        <div style="width: 48px; height: 2px; background: #4A7C59; margin-bottom: 24px;"></div>

        <p style="color: #2D3436; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          Hej ${guestName}! Din bokning av Viekärrsvägen 4, Trönningenäs har godkänts.
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #2D3436; margin-bottom: 24px;">
          <tr>
            <td style="padding: 8px 0; color: #636E72; width: 120px;">Incheckning</td>
            <td style="padding: 8px 0;">${fromDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Utcheckning</td>
            <td style="padding: 8px 0;">${toDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Nätter</td>
            <td style="padding: 8px 0;">${nights}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #636E72;">Att betala</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 16px;">${totalPrice.toLocaleString('sv-SE')} kr</td>
          </tr>
        </table>

        <div style="background: white; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <h3 style="color: #2D3436; margin: 0 0 8px; font-size: 16px;">Betala via Swish</h3>
          <p style="color: #636E72; font-size: 14px; margin: 0 0 16px;">
            Swisha <strong>${totalPrice.toLocaleString('sv-SE')} kr</strong> till numret nedan.
            Ange referensen så vi kan koppla betalningen till din bokning.
          </p>

          <img src="data:image/jpeg;base64,${SWISH_QR_BASE64}" alt="Swish QR-kod" style="width: 200px; height: 200px; margin-bottom: 12px; border-radius: 8px;" />

          <p style="font-size: 22px; font-weight: 700; color: #2D3436; margin: 8px 0 4px; letter-spacing: 1px;">
            076-621 08 30
          </p>

          <p style="font-size: 13px; color: #636E72; margin: 4px 0 8px;">Swish-referens:</p>
          <p style="font-family: monospace; font-size: 18px; font-weight: 700; color: #D4A574; margin: 0; background: #F5F0EB; display: inline-block; padding: 8px 16px; border-radius: 8px;">
            ${swishReference}
          </p>
        </div>

        <div style="background: #FFF8E7; border-radius: 8px; padding: 16px; border-left: 3px solid #D4A574;">
          <p style="color: #2D3436; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>Viktigt:</strong> Bokningen är giltig först efter att betalningen har genomförts.
            Betala gärna snarast möjligt för att säkra dina datum.
          </p>
        </div>

        <p style="color: #636E72; font-size: 12px; margin-top: 24px; text-align: center;">
          Viekärrsvägen 4, Trönningenäs
        </p>
      </div>
    `,
  });
}

export async function sendDenialEmail({
  guestName,
  guestEmail,
  checkIn,
  checkOut,
}: {
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const fromDate = formatDate(checkIn);
  const toDate = formatDate(checkOut);

  await resend.emails.send({
    from: 'Viekärrsvägen 4 <onboarding@resend.dev>',
    to: [guestEmail],
    subject: `Bokningsförfrågan ${fromDate} - ${toDate}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #F5F0EB; border-radius: 16px;">
        <h2 style="color: #2D3436; margin: 0 0 4px;">Bokningsförfrågan</h2>
        <div style="width: 48px; height: 2px; background: #D4A574; margin-bottom: 24px;"></div>

        <p style="color: #2D3436; font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
          Hej ${guestName},
        </p>
        <p style="color: #2D3436; font-size: 15px; line-height: 1.7; margin: 0 0 8px;">
          Tyvärr har er bokningsförfrågan för ${fromDate} - ${toDate} inte kunnat godkännas då stugan inte är ledig under den perioden.
        </p>
        <p style="color: #2D3436; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
          Ni är varmt välkomna att skicka en ny förfrågan för andra datum.
        </p>

        <p style="color: #2D3436; font-size: 15px; line-height: 1.7; margin: 0;">
          Med vänlig hälsning,<br/>
          Christian & Ann-Sofie
        </p>

        <p style="color: #636E72; font-size: 12px; margin-top: 24px; text-align: center;">
          Viekärrsvägen 4, Trönningenäs
        </p>
      </div>
    `,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
}
