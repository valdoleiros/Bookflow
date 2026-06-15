import twilio from 'twilio'

const accountSid    = process.env.TWILIO_ACCOUNT_SID
const authToken     = process.env.TWILIO_AUTH_TOKEN
const fromNumber    = process.env.TWILIO_PHONE_NUMBER
// Messaging Service SID allows Twilio to route via local PT numbers automatically.
// Preferred over a fixed US number for Portuguese delivery. Set in Twilio console.
const messagingSid  = process.env.TWILIO_MESSAGING_SERVICE_SID
// Alphanumeric Sender ID — e.g. "BookFlow". Only works in countries that allow it
// (PT does; US does not). Requires Twilio account upgrade + registration.
const senderId      = process.env.TWILIO_SENDER_ID

export async function sendSms(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!accountSid || !authToken) {
    // Dev fallback
    console.log(`\n[SMS MOCK] Para: ${to}\n${message}\n`)
    return { success: true }
  }

  try {
    const client = twilio(accountSid, authToken)
    const normalized = normalizePhone(to)

    const params: Parameters<typeof client.messages.create>[0] = {
      body: message,
      to:   normalized,
    }

    // Priority: Messaging Service > Alphanumeric Sender ID > fixed phone number
    if (messagingSid) {
      params.messagingServiceSid = messagingSid
    } else if (senderId) {
      params.from = senderId
    } else if (fromNumber) {
      params.from = normalizePhone(fromNumber)
    } else {
      console.error('[SMS] No sender configured')
      return { success: false, error: 'No SMS sender configured' }
    }

    await client.messages.create(params)
    return { success: true }
  } catch (err: any) {
    console.error('[SMS] Send error:', err.message)
    return { success: false, error: err.message }
  }
}

// Normalizes Portuguese and international phone numbers to E.164.
// Handles: 912345678, 00351912345678, +351912345678, +447911123456
export function normalizePhone(phone: string): string {
  const clean = phone.replace(/[\s\-().]/g, '').replace(/^00/, '+')
  if (clean.startsWith('+')) return clean
  // Assume Portugal if no country code
  return `+351${clean}`
}
