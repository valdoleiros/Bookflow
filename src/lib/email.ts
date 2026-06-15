import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'

const resend = new Resend(process.env.RESEND_API_KEY)

interface BookingEmailParams {
  to: string
  customerName: string
  businessName: string
  serviceName: string
  startTime: string
  timezone: string
  staffName?: string | null
  bookingId: string
}

export async function sendBookingConfirmation(params: BookingEmailParams) {
  const { to, customerName, businessName, serviceName, startTime, timezone, staffName, bookingId } = params

  const zonedDate = toZonedTime(parseISO(startTime), timezone)
  const dateStr = format(zonedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })
  const timeStr = format(zonedDate, 'HH:mm', { locale: pt })
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingId}/cancel`

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Marcação Confirmada</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#141414;border-radius:20px;border:1px solid #262626;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,#1a1a1a,#141414);">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#4f46e5;border-radius:14px;margin-bottom:16px;">
                <span style="color:#fff;font-size:22px;">✂</span>
              </div>
              <div style="font-size:13px;font-weight:600;color:#818cf8;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">BookFlow</div>
              <div style="font-size:11px;color:#525252;">${businessName}</div>
            </td>
          </tr>

          <!-- Success badge -->
          <tr>
            <td style="padding:0 32px;">
              <div style="background:#052e16;border:1px solid #14532d;border-radius:12px;padding:12px 16px;text-align:center;">
                <span style="color:#4ade80;font-size:13px;font-weight:600;">✓ Marcação confirmada</span>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0;color:#e5e5e5;font-size:16px;font-weight:600;">Olá, ${customerName}!</p>
              <p style="margin:8px 0 0;color:#737373;font-size:14px;line-height:1.5;">
                A sua marcação em <strong style="color:#a3a3a3;">${businessName}</strong> está confirmada.
              </p>
            </td>
          </tr>

          <!-- Details card -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" style="background:#1c1c1c;border:1px solid #262626;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #262626;">
                    <div style="font-size:11px;color:#525252;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Serviço</div>
                    <div style="font-size:15px;color:#e5e5e5;font-weight:600;">${serviceName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #262626;">
                    <div style="font-size:11px;color:#525252;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Data</div>
                    <div style="font-size:15px;color:#e5e5e5;font-weight:600;">${dateStr}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;${staffName ? 'border-bottom:1px solid #262626;' : ''}">
                    <div style="font-size:11px;color:#525252;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Hora</div>
                    <div style="font-size:28px;color:#818cf8;font-weight:700;font-family:monospace;">${timeStr}</div>
                  </td>
                </tr>
                ${staffName ? `
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11px;color:#525252;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Barbeiro</div>
                    <div style="font-size:15px;color:#e5e5e5;font-weight:600;">${staffName}</div>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>

          <!-- Cancel link -->
          <tr>
            <td style="padding:8px 32px 32px;text-align:center;">
              <p style="margin:0 0 12px;color:#525252;font-size:13px;">Precisa de cancelar?</p>
              <a href="${cancelUrl}"
                style="display:inline-block;color:#ef4444;font-size:13px;font-weight:600;text-decoration:none;background:#1a0000;border:1px solid #450a0a;border-radius:10px;padding:10px 20px;">
                Cancelar Marcação
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#0f0f0f;border-top:1px solid #1c1c1c;text-align:center;">
              <p style="margin:0;color:#404040;font-size:11px;">BookFlow · Sistema de marcações para barbearias</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    await resend.emails.send({
      from: `${businessName} via BookFlow <${process.env.FROM_EMAIL}>`,
      to,
      subject: `✓ Marcação confirmada — ${serviceName} às ${timeStr}`,
      html,
    })
  } catch {
    // Email failure is non-fatal — booking was already created
  }
}
