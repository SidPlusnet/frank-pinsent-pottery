import type { MarketEvent, ProductImage } from './types'

export interface AdminProduct {
  id: number
  slug: string
  title: string
  description: string
  price_pence: number
  stock: number
  kind: 'range' | 'oneoff'
  published: number
  sort: number
  image_url: string | null
  image_count: number
}

export interface CommissionRequest {
  id: number
  name: string
  email: string
  idea: string
  budget: string
  timescale: string
  status: 'new' | 'replied' | 'done' | 'declined'
  created_at: string
}

export interface Order {
  id: string
  status: 'pending' | 'paid' | 'shipped' | 'cancelled'
  customer_name: string | null
  customer_email: string | null
  shipping_address: string | null
  items_json: string
  subtotal_pence: number
  shipping_pence: number
  total_pence: number
  created_at: string
  paid_at: string | null
  shipped_at: string | null
}

export interface PotInput {
  title: string
  description: string
  price_pence: number
  stock: number
  kind: 'range' | 'oneoff'
  published: number
}

// ---------- Pots ----------

export async function adminListProducts(db: D1Database): Promise<AdminProduct[]> {
  const { results } = await db
    .prepare(
      `SELECT p.*,
        (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY sort, id LIMIT 1) AS image_url,
        (SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id) AS image_count
       FROM products p ORDER BY p.kind DESC, p.sort, p.id`,
    )
    .all<AdminProduct>()
  return results
}

export async function adminGetProduct(db: D1Database, id: number) {
  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<AdminProduct>()
  if (!product) return null
  const { results: images } = await db
    .prepare('SELECT id, url, alt, sort FROM product_images WHERE product_id = ? ORDER BY sort, id')
    .bind(id)
    .all<ProductImage>()
  return { product, images }
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'pot'
  )
}

async function uniqueSlug(db: D1Database, base: string): Promise<string> {
  const { results } = await db
    .prepare("SELECT slug FROM products WHERE slug = ? OR slug LIKE ? || '-%'")
    .bind(base, base)
    .all<{ slug: string }>()
  const taken = new Set(results.map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
}

/** New pots go to the top of their shelf. */
export async function createProduct(db: D1Database, p: PotInput): Promise<number> {
  const slug = await uniqueSlug(db, slugify(p.title))
  const row = await db
    .prepare(
      `INSERT INTO products (slug, title, description, price_pence, stock, kind, published, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MIN(sort), 1) - 1 FROM products))
       RETURNING id`,
    )
    .bind(slug, p.title, p.description, p.price_pence, p.stock, p.kind, p.published)
    .first<{ id: number }>()
  return row!.id
}

export async function updateProduct(db: D1Database, id: number, p: PotInput) {
  await db
    .prepare(
      `UPDATE products SET title = ?, description = ?, price_pence = ?, stock = ?, kind = ?, published = ?,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
    .bind(p.title, p.description, p.price_pence, p.stock, p.kind, p.published, id)
    .run()
}

export async function setPublished(db: D1Database, id: number, published: boolean) {
  await db.prepare('UPDATE products SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(published ? 1 : 0, id).run()
}

/** Move a pot up or down within its shelf (range / one-offs). Renumbers that shelf. */
export async function moveProduct(db: D1Database, id: number, dir: 'up' | 'down') {
  const me = await db.prepare('SELECT kind FROM products WHERE id = ?').bind(id).first<{ kind: string }>()
  if (!me) return
  const { results } = await db
    .prepare('SELECT id FROM products WHERE kind = ? ORDER BY sort, id')
    .bind(me.kind)
    .all<{ id: number }>()
  const ids = results.map((r) => r.id)
  const i = ids.indexOf(id)
  const j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  await db.batch(ids.map((pid, n) => db.prepare('UPDATE products SET sort = ? WHERE id = ?').bind(n, pid)))
}

/** Returns R2 keys of uploaded photos so the caller can delete them from storage. */
export async function deleteProduct(db: D1Database, id: number): Promise<string[]> {
  const { results } = await db.prepare('SELECT url FROM product_images WHERE product_id = ?').bind(id).all<{ url: string }>()
  await db.batch([
    db.prepare('DELETE FROM product_images WHERE product_id = ?').bind(id),
    db.prepare('DELETE FROM products WHERE id = ?').bind(id),
  ])
  return results.map((r) => mediaKey(r.url)).filter((k): k is string => !!k)
}

// ---------- Photos ----------

/** '/media/pots/3/abc.webp' -> 'pots/3/abc.webp'; bundled '/img/...' files -> null */
export function mediaKey(url: string): string | null {
  return url.startsWith('/media/') ? url.slice('/media/'.length) : null
}

export async function addImage(db: D1Database, productId: number, url: string, alt: string) {
  await db
    .prepare(
      `INSERT INTO product_images (product_id, url, alt, sort)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort), -1) + 1 FROM product_images WHERE product_id = ?))`,
    )
    .bind(productId, url, alt, productId)
    .run()
}

export async function getImage(db: D1Database, imageId: number) {
  return db.prepare('SELECT id, product_id, url FROM product_images WHERE id = ?').bind(imageId).first<{ id: number; product_id: number; url: string }>()
}

export async function deleteImage(db: D1Database, imageId: number) {
  await db.prepare('DELETE FROM product_images WHERE id = ?').bind(imageId).run()
}

export async function makeMainImage(db: D1Database, imageId: number, productId: number) {
  await db
    .prepare(
      `UPDATE product_images SET sort = (SELECT MIN(sort) - 1 FROM product_images WHERE product_id = ?) WHERE id = ?`,
    )
    .bind(productId, imageId)
    .run()
}

// ---------- Markets ----------

export async function adminListEvents(db: D1Database): Promise<(MarketEvent & { published: number })[]> {
  const { results } = await db.prepare('SELECT * FROM events ORDER BY starts_on DESC').all<MarketEvent & { published: number }>()
  return results
}

export async function getEvent(db: D1Database, id: number) {
  return db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<MarketEvent>()
}

export interface EventInput {
  title: string
  location: string
  starts_on: string
  ends_on: string | null
  link: string | null
}

export async function saveEvent(db: D1Database, id: number | null, e: EventInput) {
  if (id) {
    await db
      .prepare('UPDATE events SET title = ?, location = ?, starts_on = ?, ends_on = ?, link = ? WHERE id = ?')
      .bind(e.title, e.location, e.starts_on, e.ends_on, e.link, id)
      .run()
  } else {
    await db
      .prepare('INSERT INTO events (title, location, starts_on, ends_on, link) VALUES (?, ?, ?, ?, ?)')
      .bind(e.title, e.location, e.starts_on, e.ends_on, e.link)
      .run()
  }
}

export async function deleteEvent(db: D1Database, id: number) {
  await db.prepare('DELETE FROM events WHERE id = ?').bind(id).run()
}

// ---------- Enquiries & orders ----------

export async function listEnquiries(db: D1Database): Promise<CommissionRequest[]> {
  const { results } = await db
    .prepare(`SELECT * FROM commission_requests ORDER BY (status = 'new') DESC, created_at DESC LIMIT 200`)
    .all<CommissionRequest>()
  return results
}

export async function setEnquiryStatus(db: D1Database, id: number, status: CommissionRequest['status']) {
  await db.prepare('UPDATE commission_requests SET status = ? WHERE id = ?').bind(status, id).run()
}

export async function listOrders(db: D1Database): Promise<Order[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM orders WHERE status != 'pending'
       ORDER BY (status = 'paid') DESC, COALESCE(paid_at, created_at) DESC LIMIT 200`,
    )
    .all<Order>()
  return results
}

/** Returns the order only if it was just changed from paid to shipped (so the email goes once). */
export async function markShipped(db: D1Database, id: string) {
  return db
    .prepare(`UPDATE orders SET status = 'shipped', shipped_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'paid' RETURNING *`)
    .bind(id)
    .first<Order>()
}

/** Little numbers for the admin menu. */
export async function adminCounts(db: D1Database) {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM commission_requests WHERE status = 'new') AS enquiries,
        (SELECT COUNT(*) FROM orders WHERE status = 'paid') AS orders`,
    )
    .first<{ enquiries: number; orders: number }>()
  return row ?? { enquiries: 0, orders: 0 }
}
