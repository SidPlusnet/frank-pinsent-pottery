import type { MarketEvent, Product, ProductImage } from './types'

const PRODUCT_COLUMNS = `
  p.id, p.slug, p.title, p.description, p.price_pence, p.stock, p.kind, p.published, p.sort,
  (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY sort, id LIMIT 1) AS image_url,
  (SELECT alt FROM product_images i WHERE i.product_id = p.id ORDER BY sort, id LIMIT 1) AS image_alt`

export async function listPublishedProducts(db: D1Database): Promise<Product[]> {
  const { results } = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products p WHERE p.published = 1 ORDER BY p.sort, p.id`)
    .all<Product>()
  return results
}

export async function getProductBySlug(db: D1Database, slug: string) {
  const product = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products p WHERE p.slug = ? AND p.published = 1`)
    .bind(slug)
    .first<Product>()
  if (!product) return null
  const { results: images } = await db
    .prepare('SELECT id, url, alt, sort FROM product_images WHERE product_id = ? ORDER BY sort, id')
    .bind(product.id)
    .all<ProductImage>()
  return { product, images }
}

export async function getProductsByIds(db: D1Database, ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(',')
  const { results } = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products p WHERE p.published = 1 AND p.id IN (${placeholders})`)
    .bind(...ids)
    .all<Product>()
  return results
}

/** Events that haven't finished yet (today counts). */
export async function listUpcomingEvents(db: D1Database, today: string): Promise<MarketEvent[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, location, starts_on, ends_on, link, notes FROM events
       WHERE published = 1 AND COALESCE(ends_on, starts_on) >= ?
       ORDER BY starts_on LIMIT 12`,
    )
    .bind(today)
    .all<MarketEvent>()
  return results
}

export async function insertCommissionRequest(
  db: D1Database,
  r: { name: string; email: string; idea: string; budget: string; timescale: string },
) {
  await db
    .prepare('INSERT INTO commission_requests (name, email, idea, budget, timescale) VALUES (?, ?, ?, ?, ?)')
    .bind(r.name, r.email, r.idea, r.budget, r.timescale)
    .run()
}
