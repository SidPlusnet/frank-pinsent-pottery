import { Hono } from 'hono'
import type { Context } from 'hono'
import { csrf } from 'hono/csrf'
import {
  addImage,
  adminCounts,
  adminGetProduct,
  adminListEvents,
  adminListProducts,
  createProduct,
  deleteEvent,
  deleteImage,
  deleteProduct,
  getEvent,
  getImage,
  listEnquiries,
  listOrders,
  makeMainImage,
  markShipped,
  mediaKey,
  moveProduct,
  saveEvent,
  setEnquiryStatus,
  setPublished,
  updateProduct,
  type EventInput,
  type PotInput,
} from './admin-db'
import { requireAdmin, type AdminVars } from './auth'
import { sendEmail, shippedEmailToCustomer } from './email'
import { todayIso } from './format'
import type { Env } from './types'
import {
  AdminLayout,
  EnquiriesPage,
  EventForm,
  MarketsPage,
  OrdersPage,
  PotForm,
  PotsList,
  type PotFormValues,
} from './views/admin'

type C = Context<{ Bindings: Env; Variables: AdminVars }>

const admin = new Hono<{ Bindings: Env; Variables: AdminVars }>()

admin.use('*', requireAdmin)
// Block form posts that come from other websites.
admin.use('*', csrf())

const MAX_PHOTOS = 12
const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

async function page(c: C, title: string, active: Parameters<typeof AdminLayout>[0]['active'], body: any, status = 200) {
  const counts = await adminCounts(c.env.DB)
  return c.html(
    <AdminLayout title={title} active={active} counts={counts} flash={c.req.query('msg')}>
      {body}
    </AdminLayout>,
    status as 200,
  )
}

const idParam = (c: C, name = 'id') => {
  const n = Number(c.req.param(name))
  return Number.isInteger(n) && n > 0 ? n : null
}

// ---------- Pots ----------

admin.get('/', async (c) => page(c, 'Pots', 'pots', <PotsList pots={await adminListProducts(c.env.DB)} />))

admin.get('/pots/new', (c) =>
  page(c, 'Add a pot', 'pots', <PotForm values={{ title: '', description: '', price: '', stock: '1', kind: 'range', published: true }} />),
)

/** "£28.50" / "28.5" / "28" -> 2850. Null if not a sensible price. */
function parsePrice(s: string): number | null {
  const clean = s.replace(/[£,\s]/g, '')
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(clean)) return null
  return Math.round(parseFloat(clean) * 100)
}

function readPotForm(form: FormData): { values: PotFormValues; input?: PotInput; error?: string } {
  const s = (k: string) => String(form.get(k) ?? '').trim()
  const values: PotFormValues = {
    title: s('title').slice(0, 100),
    description: s('description').slice(0, 3000).replace(/\r\n/g, '\n'),
    price: s('price'),
    stock: s('stock'),
    kind: s('kind') === 'oneoff' ? 'oneoff' : 'range',
    published: form.get('published') === '1',
  }
  const pence = parsePrice(values.price)
  const stock = Number(values.stock)
  let error: string | undefined
  if (!values.title) error = 'Please give the pot a name.'
  else if (pence === null || pence < 100) error = 'Please enter a price in pounds, like 28 or 28.50.'
  else if (!Number.isInteger(stock) || stock < 0 || stock > 999) error = 'Stock should be a whole number (0 or more).'
  if (error) return { values, error }
  return {
    values,
    input: {
      title: values.title,
      description: values.description,
      price_pence: pence!,
      stock,
      kind: values.kind,
      published: values.published ? 1 : 0,
    },
  }
}

/** Store uploaded photos in R2 and attach them to the pot. Returns an error message if any were skipped. */
async function savePhotos(c: C, productId: number, title: string, form: FormData): Promise<string | undefined> {
  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return
  const existing = (await adminGetProduct(c.env.DB, productId))?.images.length ?? 0
  let skipped = 0
  for (const [i, file] of files.entries()) {
    const ext = PHOTO_TYPES[file.type]
    if (!ext || file.size > MAX_PHOTO_BYTES || existing + i >= MAX_PHOTOS) {
      skipped++
      continue
    }
    const key = `pots/${productId}/${crypto.randomUUID()}.${ext}`
    await c.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
    await addImage(c.env.DB, productId, `/media/${key}`, title)
  }
  if (skipped)
    return `${skipped} photo${skipped > 1 ? 's were' : ' was'} skipped. Photos must be JPEG, PNG or WebP, under 10MB, and up to ${MAX_PHOTOS} per pot.`
}

admin.post('/pots', async (c) => {
  const form = await c.req.formData()
  const { values, input, error } = readPotForm(form)
  if (!input) return page(c, 'Add a pot', 'pots', <PotForm values={values} error={error} />, 400)
  const id = await createProduct(c.env.DB, input)
  const photoError = await savePhotos(c, id, input.title, form)
  if (photoError) {
    const found = await adminGetProduct(c.env.DB, id)
    return page(c, input.title, 'pots', <PotForm id={id} slug={found!.product.slug} values={values} images={found!.images} error={photoError} />)
  }
  return c.redirect(`/admin/pots/${id}?msg=created`, 303)
})

admin.get('/pots/:id', async (c) => {
  const id = idParam(c)
  const found = id && (await adminGetProduct(c.env.DB, id))
  if (!found) return c.redirect('/admin', 303)
  const p = found.product
  const values: PotFormValues = {
    title: p.title,
    description: p.description,
    price: (p.price_pence / 100).toFixed(p.price_pence % 100 ? 2 : 0),
    stock: String(p.stock),
    kind: p.kind,
    published: !!p.published,
  }
  return page(c, p.title, 'pots', <PotForm id={p.id} slug={p.slug} values={values} images={found.images} />)
})

admin.post('/pots/:id', async (c) => {
  const id = idParam(c)
  const found = id && (await adminGetProduct(c.env.DB, id))
  if (!found) return c.redirect('/admin', 303)
  const form = await c.req.formData()
  const { values, input, error } = readPotForm(form)
  if (!input)
    return page(c, found.product.title, 'pots', <PotForm id={found.product.id} slug={found.product.slug} values={values} images={found.images} error={error} />, 400)
  await updateProduct(c.env.DB, found.product.id, input)
  const photoError = await savePhotos(c, found.product.id, input.title, form)
  if (photoError) {
    const again = await adminGetProduct(c.env.DB, found.product.id)
    return page(c, input.title, 'pots', <PotForm id={found.product.id} slug={found.product.slug} values={values} images={again!.images} error={photoError} />)
  }
  return c.redirect(`/admin/pots/${found.product.id}?msg=saved`, 303)
})

admin.post('/pots/:id/:action{hide|show}', async (c) => {
  const id = idParam(c)
  if (id) await setPublished(c.env.DB, id, c.req.param('action') === 'show')
  return c.redirect(`/admin?msg=${c.req.param('action') === 'show' ? 'shown' : 'hidden'}`, 303)
})

admin.post('/pots/:id/move/:dir{up|down}', async (c) => {
  const id = idParam(c)
  if (id) await moveProduct(c.env.DB, id, c.req.param('dir') as 'up' | 'down')
  return c.redirect('/admin', 303)
})

admin.post('/pots/:id/delete', async (c) => {
  const id = idParam(c)
  if (id) {
    const keys = await deleteProduct(c.env.DB, id)
    if (keys.length) await c.env.MEDIA.delete(keys)
  }
  return c.redirect('/admin?msg=deleted', 303)
})

// ---------- Photos ----------

admin.post('/photos/:id/delete', async (c) => {
  const id = idParam(c)
  const img = id && (await getImage(c.env.DB, id))
  if (!img) return c.redirect('/admin', 303)
  await deleteImage(c.env.DB, img.id)
  const key = mediaKey(img.url)
  if (key) await c.env.MEDIA.delete(key)
  return c.redirect(`/admin/pots/${img.product_id}?msg=photo-deleted`, 303)
})

admin.post('/photos/:id/main', async (c) => {
  const id = idParam(c)
  const img = id && (await getImage(c.env.DB, id))
  if (!img) return c.redirect('/admin', 303)
  await makeMainImage(c.env.DB, img.id, img.product_id)
  return c.redirect(`/admin/pots/${img.product_id}?msg=photo-main`, 303)
})

// ---------- Markets ----------

function readEventForm(form: FormData): { input?: EventInput; error?: string; raw: Partial<EventInput> } {
  const s = (k: string) => String(form.get(k) ?? '').trim()
  const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)
  const raw = { title: s('title').slice(0, 120), location: s('location').slice(0, 120), starts_on: s('starts_on'), ends_on: s('ends_on') || null, link: s('link') || null }
  if (!raw.title) return { raw, error: 'Please give the market a name.' }
  if (!isDate(raw.starts_on)) return { raw, error: 'Please choose a start date.' }
  if (raw.ends_on && (!isDate(raw.ends_on) || raw.ends_on < raw.starts_on)) return { raw, error: 'The end date should be after the start date.' }
  if (raw.link && !/^https?:\/\/\S+$/i.test(raw.link)) return { raw, error: 'The link should start with https://' }
  return { raw, input: raw as EventInput }
}

admin.get('/markets', async (c) =>
  page(c, 'Markets', 'markets', <MarketsPage events={await adminListEvents(c.env.DB)} today={todayIso()} />),
)

admin.post('/markets', async (c) => {
  const { input, error } = readEventForm(await c.req.formData())
  if (!input) return page(c, 'Markets', 'markets', <MarketsPage events={await adminListEvents(c.env.DB)} today={todayIso()} error={error} />, 400)
  await saveEvent(c.env.DB, null, input)
  return c.redirect('/admin/markets?msg=event-saved', 303)
})

admin.get('/markets/:id', async (c) => {
  const id = idParam(c)
  const e = id && (await getEvent(c.env.DB, id))
  if (!e) return c.redirect('/admin/markets', 303)
  return page(
    c,
    'Edit market',
    'markets',
    <>
      <div class="a-title">
        <h1>Edit market</h1>
      </div>
      <EventForm e={e} />
    </>,
  )
})

admin.post('/markets/:id', async (c) => {
  const id = idParam(c)
  if (!id) return c.redirect('/admin/markets', 303)
  const { input, error, raw } = readEventForm(await c.req.formData())
  if (!input)
    return page(c, 'Edit market', 'markets', <><div class="a-title"><h1>Edit market</h1></div><EventForm e={{ ...raw, id } as any} error={error} /></>, 400)
  await saveEvent(c.env.DB, id, input)
  return c.redirect('/admin/markets?msg=event-saved', 303)
})

admin.post('/markets/:id/delete', async (c) => {
  const id = idParam(c)
  if (id) await deleteEvent(c.env.DB, id)
  return c.redirect('/admin/markets?msg=event-deleted', 303)
})

// ---------- Enquiries ----------

admin.get('/enquiries', async (c) => page(c, 'Enquiries', 'enquiries', <EnquiriesPage items={await listEnquiries(c.env.DB)} />))

admin.post('/enquiries/:id/:status{replied|done|declined}', async (c) => {
  const id = idParam(c)
  if (id) await setEnquiryStatus(c.env.DB, id, c.req.param('status') as 'replied' | 'done' | 'declined')
  return c.redirect('/admin/enquiries?msg=status', 303)
})

// ---------- Orders ----------

admin.get('/orders', async (c) => page(c, 'Orders', 'orders', <OrdersPage orders={await listOrders(c.env.DB)} />))

admin.post('/orders/:id/shipped', async (c) => {
  const order = await markShipped(c.env.DB, c.req.param('id'))
  if (order?.customer_email)
    c.executionCtx.waitUntil(
      sendEmail(c.env, { to: order.customer_email, replyTo: c.env.ORDER_NOTIFY_EMAIL, ...shippedEmailToCustomer(order) }),
    )
  return c.redirect('/admin/orders?msg=shipped', 303)
})

export default admin
