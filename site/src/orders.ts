import type { Order } from './admin-db'

export interface OrderItem {
  id: number
  title: string
  price_pence: number
  qty: number
}

export async function createPendingOrder(
  db: D1Database,
  o: { id: string; items: OrderItem[]; subtotal: number; shipping: number },
) {
  await db
    .prepare(
      `INSERT INTO orders (id, status, items_json, subtotal_pence, shipping_pence, total_pence)
       VALUES (?, 'pending', ?, ?, ?, ?)`,
    )
    .bind(o.id, JSON.stringify(o.items), o.subtotal, o.shipping, o.subtotal + o.shipping)
    .run()
}

export async function attachSquareIds(db: D1Database, id: string, squareOrderId: string, linkId: string) {
  await db.prepare('UPDATE orders SET square_order_id = ?, square_link_id = ? WHERE id = ?').bind(squareOrderId, linkId, id).run()
}

/**
 * Marks an order paid exactly once (Square may send the same webhook more than once)
 * and takes the pots out of stock. Returns the order and any pots that had already sold out,
 * or null if it was already handled / isn't ours.
 */
export async function markPaid(
  db: D1Database,
  squareOrderId: string,
  customer: { name: string | null; email: string | null; address: Record<string, string> | null },
): Promise<{ order: Order; items: OrderItem[]; shortages: string[] } | null> {
  const order = await db
    .prepare(
      `UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP,
         customer_name = COALESCE(?, customer_name), customer_email = COALESCE(?, customer_email),
         shipping_address = COALESCE(?, shipping_address)
       WHERE square_order_id = ? AND status = 'pending'
       RETURNING *`,
    )
    .bind(customer.name, customer.email, customer.address ? JSON.stringify(customer.address) : null, squareOrderId)
    .first<Order>()
  if (!order) return null

  const items: OrderItem[] = JSON.parse(order.items_json)
  // Check stock before taking it, so Frank is warned if two people bought the last one at once.
  const shortages: string[] = []
  for (const it of items) {
    const row = await db.prepare('SELECT stock FROM products WHERE id = ?').bind(it.id).first<{ stock: number }>()
    if (!row || row.stock < it.qty) shortages.push(it.title)
  }
  await db.batch(items.map((it) => db.prepare('UPDATE products SET stock = MAX(stock - ?, 0) WHERE id = ?').bind(it.qty, it.id)))
  return { order, items, shortages }
}

export async function getOrder(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Order>()
}
