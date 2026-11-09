import type { Child, FC } from 'hono/jsx'
import type { AdminProduct, CommissionRequest, Order } from '../admin-db'
import { dateRange, price } from '../format'
import type { MarketEvent, ProductImage } from '../types'

type Section = 'pots' | 'markets' | 'enquiries' | 'orders'

const FLASH: Record<string, string> = {
  created: 'Pot added.',
  saved: 'Saved.',
  deleted: 'Deleted.',
  hidden: 'Hidden from the shop.',
  shown: 'Showing in the shop.',
  'photo-deleted': 'Photo removed.',
  'photo-main': 'Main photo changed.',
  'event-saved': 'Market saved.',
  'event-deleted': 'Market deleted.',
  shipped: 'Marked as posted.',
  status: 'Updated.',
}

export const AdminLayout: FC<{
  title: string
  active: Section
  counts: { enquiries: number; orders: number }
  flash?: string
  children: Child
}> = ({ title, active, counts, flash, children }) => {
  const link = (key: Section, href: string, label: string, n = 0) => (
    <a href={href} aria-current={active === key ? 'page' : undefined}>
      {label}
      {n > 0 && <span class="badge">{n}</span>}
    </a>
  )
  return (
    <html lang="en-GB">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{title} · Admin</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="/admin.css" />
        <script src="/admin.js" defer></script>
      </head>
      <body>
        <header class="a-head">
          <a class="a-brand" href="/admin">
            Frank Pinsent <span>admin</span>
          </a>
          <nav class="a-nav">
            {link('pots', '/admin', 'Pots')}
            {link('markets', '/admin/markets', 'Markets')}
            {link('enquiries', '/admin/enquiries', 'Enquiries', counts.enquiries)}
            {link('orders', '/admin/orders', 'Orders', counts.orders)}
            <a href="/" target="_blank" rel="noopener">
              View site ↗
            </a>
          </nav>
        </header>
        <main class="a-main">
          {flash && FLASH[flash] && (
            <p class="flash" role="status">
              {FLASH[flash]}
            </p>
          )}
          {children}
        </main>
      </body>
    </html>
  )
}

const Btn: FC<{ action: string; label: string; cls?: string; confirm?: string; title?: string }> = (p) => (
  <form method="post" action={p.action} class="inline" data-confirm={p.confirm}>
    <button class={`a-btn ${p.cls ?? ''}`} type="submit" title={p.title} aria-label={p.title}>
      {p.label}
    </button>
  </form>
)

// ---------- Pots list ----------

export const PotsList: FC<{ pots: AdminProduct[] }> = ({ pots }) => {
  const shelf = (label: string, hint: string, list: AdminProduct[]) => (
    <section class="a-section">
      <h2>
        {label} <span class="hint">{hint}</span>
      </h2>
      {list.length === 0 ? (
        <p class="hint">None yet.</p>
      ) : (
        <ul class="pot-list">
          {list.map((p, i) => (
            <li class={p.published ? '' : 'is-hidden'}>
              <a class="pot-list__main" href={`/admin/pots/${p.id}`}>
                {p.image_url ? <img src={p.image_url} alt="" width="64" height="64" loading="lazy" /> : <span class="nophoto">No photo</span>}
                <span>
                  <strong>{p.title}</strong>
                  <span class="meta">
                    {price(p.price_pence)} ·{' '}
                    {p.stock > 0 ? `${p.stock} in stock` : <span class="warn">{p.kind === 'oneoff' ? 'Sold' : 'Sold out'}</span>}
                    {!p.published && <span class="tag">Hidden</span>}
                  </span>
                </span>
              </a>
              <span class="pot-list__actions">
                <Btn action={`/admin/pots/${p.id}/move/up`} label="↑" title="Move up" cls={i === 0 ? 'is-disabled' : ''} />
                <Btn action={`/admin/pots/${p.id}/move/down`} label="↓" title="Move down" cls={i === list.length - 1 ? 'is-disabled' : ''} />
                <Btn action={`/admin/pots/${p.id}/${p.published ? 'hide' : 'show'}`} label={p.published ? 'Hide' : 'Show'} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
  return (
    <>
      <div class="a-title">
        <h1>Pots</h1>
        <a class="a-btn a-btn--primary" href="/admin/pots/new">
          + Add a pot
        </a>
      </div>
      {shelf('Always available', 'made in batches', pots.filter((p) => p.kind === 'range'))}
      {shelf('One-offs', 'single pieces', pots.filter((p) => p.kind === 'oneoff'))}
    </>
  )
}

// ---------- Pot form ----------

export interface PotFormValues {
  title: string
  description: string
  price: string
  stock: string
  kind: 'range' | 'oneoff'
  published: boolean
}

export const PotForm: FC<{
  id?: number
  slug?: string
  values: PotFormValues
  images?: ProductImage[]
  error?: string
}> = ({ id, slug, values: v, images = [], error }) => (
  <>
    <div class="a-title">
      <h1>{id ? v.title || 'Edit pot' : 'Add a pot'}</h1>
      {slug && (
        <a class="a-btn" href={`/pot/${slug}`} target="_blank" rel="noopener">
          View in shop ↗
        </a>
      )}
    </div>
    <p>
      <a href="/admin">← All pots</a>
    </p>

    {error && (
      <p class="flash flash--error" role="alert">
        {error}
      </p>
    )}

    <form class="a-form" method="post" action={id ? `/admin/pots/${id}` : '/admin/pots'} enctype="multipart/form-data" data-pot-form>
      <label>
        Name
        <input name="title" required maxlength={100} value={v.title} placeholder="e.g. Striped mug" />
      </label>

      <div class="row">
        <label>
          Price (£)
          <input name="price" required inputmode="decimal" value={v.price} placeholder="28" />
        </label>
        <label>
          How many in stock?
          <input name="stock" type="number" min={0} max={999} required value={v.stock} />
        </label>
      </div>

      <fieldset>
        <legend>Type</legend>
        <label class="choice">
          <input type="radio" name="kind" value="range" checked={v.kind === 'range'} /> Always available{' '}
          <span class="hint">I make these in batches</span>
        </label>
        <label class="choice">
          <input type="radio" name="kind" value="oneoff" checked={v.kind === 'oneoff'} /> One-off{' '}
          <span class="hint">a single piece, stock is usually 1</span>
        </label>
      </fieldset>

      <label>
        Description
        <textarea name="description" rows={5} maxlength={3000} placeholder="Size, what it's for, anything special. Leave a blank line between paragraphs.">
          {v.description}
        </textarea>
      </label>

      <label>
        {images.length ? 'Add more photos' : 'Photos'}
        <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple data-resize />
        <span class="hint">The first photo is the one shown in the shop. Photos are shrunk automatically before uploading.</span>
        <span class="previews" data-previews></span>
      </label>

      <label class="choice">
        <input type="checkbox" name="published" value="1" checked={v.published} /> Show in the shop
      </label>

      <div class="actions">
        <button class="a-btn a-btn--primary" type="submit" data-submit>
          {id ? 'Save changes' : 'Add pot'}
        </button>
      </div>
    </form>

    {id && images.length > 0 && (
      <section class="a-section">
        <h2>Photos</h2>
        <ul class="photo-grid">
          {images.map((img, i) => (
            <li>
              <img src={img.url} alt={img.alt} width="200" height="200" loading="lazy" />
              <div class="photo-grid__actions">
                {i === 0 ? <span class="tag">Main photo</span> : <Btn action={`/admin/photos/${img.id}/main`} label="Make main" />}
                <Btn action={`/admin/photos/${img.id}/delete`} label="Remove" cls="a-btn--danger" confirm="Remove this photo?" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    )}

    {id && (
      <section class="a-section danger-zone">
        <h2>Delete this pot</h2>
        <p class="hint">
          This removes it completely, photos and all. To take it off the shop for a while, untick "Show in the shop" instead.
        </p>
        <Btn action={`/admin/pots/${id}/delete`} label="Delete pot" cls="a-btn--danger" confirm="Delete this pot for good? This can't be undone." />
      </section>
    )}
  </>
)

// ---------- Markets ----------

export const EventForm: FC<{ e?: Partial<MarketEvent>; error?: string }> = ({ e = {}, error }) => (
  <form class="a-form" method="post" action={e.id ? `/admin/markets/${e.id}` : '/admin/markets'}>
    {error && (
      <p class="flash flash--error" role="alert">
        {error}
      </p>
    )}
    <label>
      Name of the market or fair
      <input name="title" required maxlength={120} value={e.title ?? ''} />
    </label>
    <label>
      Where
      <input name="location" maxlength={120} value={e.location ?? ''} placeholder="e.g. Moreton-in-Marsh" />
    </label>
    <div class="row">
      <label>
        Starts
        <input name="starts_on" type="date" required value={e.starts_on ?? ''} />
      </label>
      <label>
        Ends <span class="hint">(if more than one day)</span>
        <input name="ends_on" type="date" value={e.ends_on ?? ''} />
      </label>
    </div>
    <label>
      Website link <span class="hint">(optional)</span>
      <input name="link" type="url" maxlength={300} value={e.link ?? ''} placeholder="https://" />
    </label>
    <div class="actions">
      <button class="a-btn a-btn--primary" type="submit">
        {e.id ? 'Save market' : 'Add market'}
      </button>
      {e.id && <a href="/admin/markets">Cancel</a>}
    </div>
  </form>
)

export const MarketsPage: FC<{ events: (MarketEvent & { published: number })[]; today: string; error?: string }> = ({
  events,
  today,
  error,
}) => {
  const upcoming = events.filter((e) => (e.ends_on ?? e.starts_on) >= today).reverse()
  const past = events.filter((e) => (e.ends_on ?? e.starts_on) < today)
  const row = (e: MarketEvent) => (
    <li>
      <span>
        <strong>{e.title}</strong>
        <span class="meta">
          {dateRange(e.starts_on, e.ends_on)}
          {e.location && ` · ${e.location}`}
        </span>
      </span>
      <span class="pot-list__actions">
        <a class="a-btn" href={`/admin/markets/${e.id}`}>
          Edit
        </a>
        <Btn action={`/admin/markets/${e.id}/delete`} label="Delete" cls="a-btn--danger" confirm={`Delete "${e.title}"?`} />
      </span>
    </li>
  )
  return (
    <>
      <div class="a-title">
        <h1>Markets &amp; fairs</h1>
      </div>
      <p class="hint">Upcoming ones appear on the About page. Past ones disappear from the site by themselves.</p>
      <section class="a-section">
        <h2>Coming up</h2>
        {upcoming.length ? <ul class="pot-list simple">{upcoming.map(row)}</ul> : <p class="hint">Nothing booked.</p>}
      </section>
      <section class="a-section">
        <h2>Add a market</h2>
        <EventForm error={error} />
      </section>
      {past.length > 0 && (
        <section class="a-section">
          <h2>Past</h2>
          <ul class="pot-list simple is-past">{past.slice(0, 20).map(row)}</ul>
        </section>
      )}
    </>
  )
}

// ---------- Enquiries ----------

const fmtDate = (s: string) => {
  const d = new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z'))
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const EnquiriesPage: FC<{ items: CommissionRequest[] }> = ({ items }) => (
  <>
    <div class="a-title">
      <h1>Commission enquiries</h1>
    </div>
    {items.length === 0 && <p class="hint">No enquiries yet. They'll appear here when someone uses the form on the Commissions page.</p>}
    <ul class="cards">
      {items.map((q) => (
        <li class={`card status-${q.status}`}>
          <div class="card__head">
            <strong>{q.name}</strong>
            <span class="meta">{fmtDate(q.created_at)}</span>
            <span class={`tag tag--${q.status}`}>{q.status === 'new' ? 'New' : q.status[0].toUpperCase() + q.status.slice(1)}</span>
          </div>
          <p class="idea">{q.idea}</p>
          {(q.budget || q.timescale) && (
            <p class="meta">
              {q.budget && `Budget: ${q.budget}`}
              {q.budget && q.timescale && ' · '}
              {q.timescale && `Needed by: ${q.timescale}`}
            </p>
          )}
          <div class="card__actions">
            <a class="a-btn a-btn--primary" href={`mailto:${q.email}?subject=${encodeURIComponent('Your commission enquiry')}`}>
              Reply to {q.email}
            </a>
            {q.status !== 'replied' && <Btn action={`/admin/enquiries/${q.id}/replied`} label="Mark replied" />}
            {q.status !== 'done' && <Btn action={`/admin/enquiries/${q.id}/done`} label="Done" />}
            {q.status !== 'declined' && <Btn action={`/admin/enquiries/${q.id}/declined`} label="Declined" />}
          </div>
        </li>
      ))}
    </ul>
  </>
)

// ---------- Orders ----------

export const OrdersPage: FC<{ orders: Order[] }> = ({ orders }) => (
  <>
    <div class="a-title">
      <h1>Orders</h1>
    </div>
    {orders.length === 0 && <p class="hint">No orders yet. Paid orders will appear here (and you'll get an email for each one).</p>}
    <ul class="cards">
      {orders.map((o) => {
        let items: { title: string; qty: number; price_pence: number }[] = []
        let addr: Record<string, string> = {}
        try {
          items = JSON.parse(o.items_json)
          addr = o.shipping_address ? JSON.parse(o.shipping_address) : {}
        } catch {}
        const addrLines = [addr.name ?? o.customer_name, addr.line1, addr.line2, addr.city, addr.postcode].filter(Boolean)
        return (
          <li class={`card status-${o.status}`}>
            <div class="card__head">
              <strong>{o.customer_name ?? 'Customer'}</strong>
              <span class="meta">{fmtDate(o.paid_at ?? o.created_at)}</span>
              <span class={`tag tag--${o.status}`}>{o.status === 'paid' ? 'To post' : o.status === 'shipped' ? 'Posted' : o.status}</span>
            </div>
            <ul class="order-items">
              {items.map((it) => (
                <li>
                  {it.qty} × {it.title} <span class="meta">{price(it.price_pence * it.qty)}</span>
                </li>
              ))}
            </ul>
            <p>
              <strong>Total {price(o.total_pence)}</strong>
            </p>
            {addrLines.length > 0 && <address>{addrLines.map((l) => <div>{l}</div>)}</address>}
            <div class="card__actions">
              {o.customer_email && (
                <a class="a-btn" href={`mailto:${o.customer_email}`}>
                  Email {o.customer_email}
                </a>
              )}
              {o.status === 'paid' && <Btn action={`/admin/orders/${o.id}/shipped`} label="Mark as posted" cls="a-btn--primary" />}
            </div>
          </li>
        )
      })}
    </ul>
  </>
)
