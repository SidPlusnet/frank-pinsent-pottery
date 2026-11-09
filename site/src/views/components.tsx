import type { Child, FC } from 'hono/jsx'
import { price } from '../format'
import type { Product } from '../types'

export const INSTAGRAM = 'https://www.instagram.com/frankpinsent/'

type NavKey = 'home' | 'shop' | 'about' | 'commissions' | 'basket' | null

export const Layout: FC<{ title?: string; description?: string; active?: NavKey; children: Child }> = ({
  title,
  description,
  active = null,
  children,
}) => {
  const fullTitle = title ? `${title} · Frank Pinsent` : 'Frank Pinsent · Earthenware'
  const desc = description ?? 'Slip-trailed earthenware by Frank Pinsent, made in the Cotswolds.'
  const nav = (key: NavKey, href: string, label: string) => (
    <a href={href} aria-current={active === key ? 'page' : undefined}>
      {label}
    </a>
  )
  return (
    <html lang="en-GB">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{fullTitle}</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={desc} />
        <meta property="og:image" content="/img/new/n15.webp" />
        <meta name="theme-color" content="#ECE5D3" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Karla:wght@400;500;600&display=swap"
        />
        <link rel="stylesheet" href="/styles.css" />
        <script src="/basket.js" defer></script>
      </head>
      <body>
        <a class="skip" href="#main">
          Skip to content
        </a>
        <header class="site-header">
          <a class="wordmark" href="/" aria-label="Frank Pinsent, home">
            Frank Pinsent
          </a>
          <nav class="site-nav" aria-label="Main">
            {nav('shop', '/shop', 'Shop')}
            {nav('about', '/about', 'About')}
            {nav('commissions', '/commissions', 'Commissions')}
            <a class="basket-link" href="/basket" aria-current={active === 'basket' ? 'page' : undefined}>
              Basket <span class="basket-count" data-basket-count>0</span>
            </a>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer class="site-footer">
          <a href={INSTAGRAM} rel="noopener" target="_blank">
            Instagram
          </a>
          <a href="/delivery-returns">Delivery &amp; returns</a>
          <a href="/privacy">Privacy</a>
          <span>© {new Date().getFullYear()} Frank Pinsent</span>
        </footer>
      </body>
    </html>
  )
}

export const ProductCard: FC<{ p: Product }> = ({ p }) => {
  const soldOut = p.stock <= 0
  const tag = soldOut ? 'Sold' : p.kind === 'oneoff' ? 'One of a kind' : null
  return (
    <a class={`card ${soldOut ? 'card--sold' : ''}`} href={`/pot/${p.slug}`}>
      <div class="card__img">
        {p.image_url ? (
          <img src={p.image_url} alt={p.image_alt || p.title} loading="lazy" width="600" height="600" />
        ) : (
          <div class="noimg">No photo yet</div>
        )}
      </div>
      <div class="card__text">
        <span class="card__title">{p.title}</span>
        <span class="card__price">{soldOut ? 'Sold' : price(p.price_pence)}</span>
      </div>
      {tag && !soldOut && <span class="card__tag">{tag}</span>}
    </a>
  )
}
