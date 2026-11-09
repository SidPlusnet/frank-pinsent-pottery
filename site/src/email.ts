import type { Order } from './admin-db'
import { price } from './format'
import type { OrderItem } from './orders'
import type { Env } from './types'

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)

/**
 * Sends one email through Resend. Never throws: a failed email must not break an order.
 * Without RESEND_API_KEY it just logs, which is handy locally.
 */
export async function sendEmail(env: Env, msg: { to: string; subject: string; html: string; text: string; replyTo?: string }) {
  if (!env.RESEND_API_KEY) {
    console.log(`[email skipped: no RESEND_API_KEY] to=${msg.to} subject="${msg.subject}"`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Frank Pinsent <onboarding@resend.dev>',
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo,
      }),
    })
    if (!res.ok) console.error('Resend failed', res.status, await res.text())
    return res.ok
  } catch (err) {
    console.error('Resend error', err)
    return false
  }
}

// ---------- Templates (plain, so they look fine in every mail app) ----------

const wrap = (inner: string) => `<!doctype html><html><body style="margin:0;background:#ece5d3;padding:24px 12px;font-family:Georgia,serif;color:#1f1611">
<div style="max-width:560px;margin:0 auto;background:#f7f3ea;padding:28px 24px;border-radius:6px">
<p style="margin:0 0 20px;letter-spacing:.2em;text-transform:uppercase;font-size:14px">Frank Pinsent</p>
${inner}
</div></body></html>`

const itemsHtml = (items: OrderItem[], shipping: number, total: number) =>
  `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:16px 0">
${items
  .map(
    (i) =>
      `<tr><td style="padding:6px 0;border-bottom:1px solid #ddd6c6">${i.qty} × ${esc(i.title)}</td><td style="padding:6px 0;border-bottom:1px solid #ddd6c6;text-align:right">${price(i.price_pence * i.qty)}</td></tr>`,
  )
  .join('')}
<tr><td style="padding:6px 0">UK delivery</td><td style="padding:6px 0;text-align:right">${price(shipping)}</td></tr>
<tr><td style="padding:8px 0;border-top:1px solid #1f1611"><strong>Total</strong></td><td style="padding:8px 0;border-top:1px solid #1f1611;text-align:right"><strong>${price(total)}</strong></td></tr>
</table>`

const itemsText = (items: OrderItem[], shipping: number, total: number) =>
  items.map((i) => `${i.qty} x ${i.title}  ${price(i.price_pence * i.qty)}`).join('\n') +
  `\nUK delivery  ${price(shipping)}\nTotal  ${price(total)}`

const addressLines = (o: Order) => {
  try {
    const a = o.shipping_address ? JSON.parse(o.shipping_address) : {}
    return [a.name, a.line1, a.line2, a.city, a.county, a.postcode, a.country].filter(Boolean) as string[]
  } catch {
    return []
  }
}

const firstName = (o: Order) => (o.customer_name ?? '').split(' ')[0] || 'there'

export function orderEmailToFrank(o: Order, items: OrderItem[], shortages: string[], siteUrl: string) {
  const addr = addressLines(o)
  const warn = shortages.length
    ? `<p style="background:#efd2c2;padding:12px;border-radius:4px"><strong>Check stock:</strong> ${shortages.map(esc).join(', ')} had already sold out when this payment came in (two people may have bought the last one at the same time). You may need to refund this customer from the Square dashboard.</p>`
    : ''
  return {
    subject: `New order: ${price(o.total_pence)} from ${o.customer_name ?? o.customer_email ?? 'a customer'}`,
    html: wrap(`<h1 style="font-weight:400;font-size:24px;margin:0 0 12px">New order</h1>${warn}
${itemsHtml(items, o.shipping_pence ?? 0, o.total_pence)}
<p style="margin:16px 0 4px"><strong>Post to</strong></p><p style="margin:0">${addr.map(esc).join('<br>') || 'No address given'}</p>
<p style="margin:16px 0">Customer email: ${esc(o.customer_email ?? 'not given')}</p>
<p><a href="${siteUrl}/admin/orders" style="color:#9b4f32">Open orders in admin</a></p>`),
    text: `New order\n${shortages.length ? `CHECK STOCK: ${shortages.join(', ')} had already sold out.\n` : ''}\n${itemsText(items, o.shipping_pence ?? 0, o.total_pence)}\n\nPost to:\n${addr.join('\n')}\n\nCustomer email: ${o.customer_email ?? ''}\n${siteUrl}/admin/orders`,
  }
}

export function orderEmailToCustomer(o: Order, items: OrderItem[]) {
  const addr = addressLines(o)
  return {
    subject: 'Thank you for your order',
    html: wrap(`<p>Hello ${esc(firstName(o))},</p>
<p>Thank you for buying my pots. I'll wrap them carefully and post them within 5 working days, and I'll email you when they're on their way.</p>
${itemsHtml(items, o.shipping_pence ?? 0, o.total_pence)}
<p style="margin:16px 0 4px"><strong>Posting to</strong></p><p style="margin:0">${addr.map(esc).join('<br>')}</p>
<p style="margin-top:20px">Any questions, just reply to this email.</p>
<p>Frank</p>`),
    text: `Hello ${firstName(o)},\n\nThank you for buying my pots. I'll wrap them carefully and post them within 5 working days, and I'll email you when they're on their way.\n\n${itemsText(items, o.shipping_pence ?? 0, o.total_pence)}\n\nPosting to:\n${addr.join('\n')}\n\nAny questions, just reply to this email.\n\nFrank`,
  }
}

export function shippedEmailToCustomer(o: Order) {
  return {
    subject: 'Your pots are on their way',
    html: wrap(`<p>Hello ${esc(firstName(o))},</p><p>Your order has been posted today. I hope you enjoy using them.</p><p>Frank</p>`),
    text: `Hello ${firstName(o)},\n\nYour order has been posted today. I hope you enjoy using them.\n\nFrank`,
  }
}

export function enquiryEmailToFrank(r: { name: string; email: string; idea: string; budget: string; timescale: string }, siteUrl: string) {
  return {
    subject: `Commission enquiry from ${r.name}`,
    html: wrap(`<h1 style="font-weight:400;font-size:24px;margin:0 0 12px">Commission enquiry</h1>
<p><strong>${esc(r.name)}</strong> (${esc(r.email)})</p>
<p style="white-space:pre-wrap">${esc(r.idea)}</p>
${r.budget ? `<p>Budget: ${esc(r.budget)}</p>` : ''}${r.timescale ? `<p>Needed by: ${esc(r.timescale)}</p>` : ''}
<p>Reply to this email to answer them directly.</p>
<p><a href="${siteUrl}/admin/enquiries" style="color:#9b4f32">Open enquiries in admin</a></p>`),
    text: `Commission enquiry from ${r.name} (${r.email})\n\n${r.idea}\n\n${r.budget ? `Budget: ${r.budget}\n` : ''}${r.timescale ? `Needed by: ${r.timescale}\n` : ''}\nReply to this email to answer them directly.`,
  }
}
