import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import admin from './admin'
import { getProductBySlug, getProductsByIds, insertCommissionRequest, listPublishedProducts, listUpcomingEvents } from './db'
import { enquiryEmailToFrank, orderEmailToCustomer, orderEmailToFrank, sendEmail } from './email'
import { todayIso } from './format'
import { attachSquareIds, createPendingOrder, getOrder, markPaid, type OrderItem } from './orders'
import { createPaymentLink, squareConfigured, toAddress, verifyWebhook } from './square'
import type { Env } from './types'
import { HomePage } from './views/home'
import { BasketPage, DeliveryReturnsPage, NotFoundPage, PrivacyPage, ThanksPage } from './views/pages'
import { ProductPage } from './views/product'
import { AboutPage, CommissionsPage, ShopPage } from './views/sections'

const app = new Hono<{ Bindings: Env }>()

app.route('/admin', admin)

const shipping = (env: Env) => Number(env.SHIPPING_PENCE) || 500

// ---------- Public pages ----------

app.get('/', (c) => c.html(<HomePage />))

app.get('/shop', async (c) => {
  const products = await listPublishedProducts(c.env.DB)
  return c.html(<ShopPage products={products} shippingPence={shipping(c.env)} />)
})

app.get('/pot/:slug', async (c) => {
  const found = await getProductBySlug(c.env.DB, c.req.param('slug'))
  if (!found) return c.notFound()
  return c.html(<ProductPage product={found.product} images={found.images} shippingPence={shipping(c.env)} />)
})

app.get('/about', async (c) => {
  const events = await listUpcomingEvents(c.env.DB, todayIso())
  return c.html(<AboutPage events={events} />)
})

app.get('/commissions', (c) => {
  const q = c.req.query('s')
  return c.html(<CommissionsPage state={q === 'sent' || q === 'error' ? q : undefined} />)
})

app.get('/basket', (c) => c.html(<BasketPage shippingPence={shipping(c.env)} />))
app.get('/delivery-returns', (c) => c.html(<DeliveryReturnsPage shippingPence={shipping(c.env)} />))
app.get('/privacy', (c) => c.html(<PrivacyPage />))

// ---------- Commission enquiries ----------

app.post('/commissions', async (c) => {
  const form = await c.req.formData()
  const field = (k: string, max: number) => String(form.get(k) ?? '').trim().slice(0, max)

  // Honeypot: real people never see this field.
  if (field('website', 200)) return c.redirect('/commissions?s=sent', 303)

  const r = {
    name: field('name', 100),
    email: field('email', 200),
    idea: field('idea', 3000),
    budget: field('budget', 50),
    timescale: field('timescale', 100),
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)
  if (!r.name || !emailOk || r.idea.length < 3) return c.redirect('/commissions?s=error', 303)

  await insertCommissionRequest(c.env.DB, r)
  if (c.env.ORDER_NOTIFY_EMAIL) {
    const mail = enquiryEmailToFrank(r, new URL(c.req.url).origin)
    c.executionCtx.waitUntil(sendEmail(c.env, { to: c.env.ORDER_NOTIFY_EMAIL, replyTo: r.email, ...mail }))
  }
  return c.redirect('/commissions?s=sent', 303)
})

// ---------- Basket API ----------

/** Current details for the items in a basket. The browser only stores ids and quantities. */
app.get('/api/basket', async (c) => {
  const ids = (c.req.query('ids') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 50)
  const products = await getProductsByIds(c.env.DB, ids)
  return c.json({
    shipping_pence: shipping(c.env),
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      price_pence: p.price_pence,
      stock: p.stock,
      kind: p.kind,
      image_url: p.image_url,
    })),
  })
})

// ---------- Checkout ----------

/**
 * Basket -> Square hosted checkout. Prices and stock are always taken from the database,
 * never from the browser.
 */
app.post('/api/checkout', async (c) => {
  if (!squareConfigured(c.env)) return c.json({ error: 'Sorry, the shop checkout is not available right now.' }, 503)

  const body = await c.req.json<{ items?: { id: unknown; qty: unknown }[] }>().catch(() => null)
  const wanted = new Map<number, number>()
  for (const it of (body?.items ?? []).slice(0, 50)) {
    const id = Number(it?.id)
    const qty = Number(it?.qty)
    if (Number.isInteger(id) && id > 0 && Number.isInteger(qty) && qty > 0 && qty <= 10) wanted.set(id, (wanted.get(id) ?? 0) + qty)
  }
  if (wanted.size === 0) return c.json({ error: 'Your basket is empty.' }, 400)

  const products = await getProductsByIds(c.env.DB, [...wanted.keys()])
  const items: OrderItem[] = []
  for (const [id, qty] of wanted) {
    const p = products.find((x) => x.id === id)
    if (!p) return c.json({ error: 'Something in your basket is no longer for sale. Please refresh the page.' }, 409)
    if (p.stock < qty)
      return c.json(
        { error: p.stock === 0 ? `Sorry, "${p.title}" has just sold. Please refresh your basket.` : `Sorry, there are only ${p.stock} of "${p.title}" left.` },
        409,
      )
    items.push({ id: p.id, title: p.title, price_pence: p.price_pence, qty })
  }

  const orderId = crypto.randomUUID()
  const subtotal = items.reduce((n, i) => n + i.price_pence * i.qty, 0)
  const ship = shipping(c.env)
  await createPendingOrder(c.env.DB, { id: orderId, items, subtotal, shipping: ship })

  try {
    const link = await createPaymentLink(c.env, {
      orderId,
      lines: items.map((i) => ({ name: i.title, qty: i.qty, price_pence: i.price_pence })),
      shippingPence: ship,
      redirectUrl: `${new URL(c.req.url).origin}/thanks?order=${orderId}`,
    })
    await attachSquareIds(c.env.DB, orderId, link.squareOrderId, link.linkId)
    return c.json({ url: link.url })
  } catch {
    return c.json({ error: 'Sorry, checkout is having trouble. Please try again in a minute.' }, 502)
  }
})

/**
 * Square tells us when a payment completes. We check Square's signature, mark the order paid,
 * take the pots out of stock and send the emails.
 */
app.post('/api/square/webhook', async (c) => {
  const key = c.env.SQUARE_WEBHOOK_SIGNATURE_KEY
  if (!key) return c.text('Not configured', 503)
  const raw = await c.req.text()
  const url = c.env.SQUARE_WEBHOOK_URL || c.req.url
  if (!(await verifyWebhook(key, url, raw, c.req.header('x-square-hmacsha256-signature')))) return c.text('Bad signature', 401)

  const event = JSON.parse(raw)
  const payment = event?.data?.object?.payment
  if (event?.type !== 'payment.updated' && event?.type !== 'payment.created') return c.text('ignored')
  if (!payment || payment.status !== 'COMPLETED' || !payment.order_id) return c.text('ignored')

  const address = toAddress(payment.shipping_address)
  const done = await markPaid(c.env.DB, payment.order_id, {
    name: address?.name || null,
    email: payment.buyer_email_address ?? null,
    address,
  })
  if (!done) return c.text('ok') // already handled, or not one of ours

  const { order, items, shortages } = done
  if (payment.amount_money?.amount !== order.total_pence)
    console.warn(`Order ${order.id}: paid ${payment.amount_money?.amount} but expected ${order.total_pence}`)

  const site = new URL(c.req.url).origin
  const emails: Promise<unknown>[] = []
  if (c.env.ORDER_NOTIFY_EMAIL)
    emails.push(sendEmail(c.env, { to: c.env.ORDER_NOTIFY_EMAIL, replyTo: order.customer_email ?? undefined, ...orderEmailToFrank(order, items, shortages, site) }))
  if (order.customer_email)
    emails.push(sendEmail(c.env, { to: order.customer_email, replyTo: c.env.ORDER_NOTIFY_EMAIL, ...orderEmailToCustomer(order, items) }))
  c.executionCtx.waitUntil(Promise.all(emails))
  return c.text('ok')
})

app.get('/thanks', async (c) => {
  const id = c.req.query('order') ?? ''
  const order = /^[0-9a-f-]{36}$/.test(id) ? await getOrder(c.env.DB, id) : null
  return c.html(<ThanksPage found={!!order} />)
})

// ---------- Uploaded photos (stored in R2) ----------

app.get('/media/:key{.+}', async (c) => {
  const obj = await c.env.MEDIA.get(c.req.param('key'))
  if (!obj) return c.notFound()
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers })
})

app.notFound((c) => c.html(<NotFoundPage />, 404))

app.onError((err, c) => {
  // Deliberate HTTP errors (e.g. the CSRF check's 403) keep their own status.
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  return c.text('Something went wrong. Please try again in a moment.', 500)
})

export default app
