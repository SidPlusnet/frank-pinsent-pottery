import type { Env } from './types'

// Square API version this code was written against. Square pins behaviour to this date.
const SQUARE_VERSION = '2024-10-17'

const base = (env: Env) =>
  env.SQUARE_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'

export const squareConfigured = (env: Env) => !!(env.SQUARE_ACCESS_TOKEN && env.SQUARE_LOCATION_ID)

export interface LinkLine {
  name: string
  qty: number
  price_pence: number
}

/**
 * Creates a Square-hosted checkout page for this order.
 * Square collects the card (or Apple/Google Pay) and the delivery address, so card details
 * never touch this site.
 */
export async function createPaymentLink(
  env: Env,
  opts: { orderId: string; lines: LinkLine[]; shippingPence: number; redirectUrl: string },
): Promise<{ url: string; linkId: string; squareOrderId: string }> {
  const line_items = opts.lines.map((l) => ({
    name: l.name.slice(0, 500),
    quantity: String(l.qty),
    base_price_money: { amount: l.price_pence, currency: 'GBP' },
  }))
  line_items.push({ name: 'UK delivery', quantity: '1', base_price_money: { amount: opts.shippingPence, currency: 'GBP' } })

  const res = await fetch(`${base(env)}/v2/online-checkout/payment-links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      idempotency_key: opts.orderId,
      order: { location_id: env.SQUARE_LOCATION_ID, reference_id: opts.orderId, line_items },
      checkout_options: {
        redirect_url: opts.redirectUrl,
        ask_for_shipping_address: true,
        allow_tipping: false,
        accepted_payment_methods: { apple_pay: true, google_pay: true },
      },
    }),
  })
  const data = (await res.json()) as any
  if (!res.ok || !data.payment_link?.url) {
    console.error('Square payment link failed', res.status, JSON.stringify(data.errors ?? data))
    throw new Error('Square checkout could not be created')
  }
  return { url: data.payment_link.url, linkId: data.payment_link.id, squareOrderId: data.payment_link.order_id }
}

/**
 * Square signs each webhook: base64(HMAC-SHA256(signatureKey, notificationUrl + rawBody)).
 * Uses crypto.subtle.verify, which compares in constant time.
 */
export async function verifyWebhook(signatureKey: string, notificationUrl: string, rawBody: string, signature: string | undefined) {
  if (!signature) return false
  let sig: Uint8Array
  try {
    sig = Uint8Array.from(atob(signature), (ch) => ch.charCodeAt(0))
  } catch {
    return false
  }
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(signatureKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  return crypto.subtle.verify('HMAC', key, sig, enc.encode(notificationUrl + rawBody))
}

/** Square Address -> our simple address shape. */
export function toAddress(a: any): Record<string, string> | null {
  if (!a) return null
  const name = [a.first_name, a.last_name].filter(Boolean).join(' ')
  const out: Record<string, string> = {
    name,
    line1: a.address_line_1 ?? '',
    line2: [a.address_line_2, a.address_line_3].filter(Boolean).join(', '),
    city: a.locality ?? '',
    county: a.administrative_district_level_1 ?? '',
    postcode: a.postal_code ?? '',
    country: a.country ?? '',
  }
  for (const k of Object.keys(out)) if (!out[k]) delete out[k]
  return out
}
