import type { FC } from 'hono/jsx'
import { paragraphs, price } from '../format'
import type { Product, ProductImage } from '../types'
import { Layout } from './components'

interface Props {
  product: Product
  images: ProductImage[]
  shippingPence: number
}

export const ProductPage: FC<Props> = ({ product: p, images, shippingPence }) => {
  const soldOut = p.stock <= 0
  const maxQty = Math.min(p.stock, 10)
  const main = images[0]
  return (
    <Layout title={p.title} description={paragraphs(p.description)[0]} active="shop">
      <article class="page page--wide pot">
        <div class="pot-gallery">
          {main ? (
            <img class="gallery__main" src={main.url} alt={main.alt || p.title} data-gallery-main width="1080" height="1080" />
          ) : (
            <div class="noimg gallery__main">No photo yet</div>
          )}
          {images.length > 1 && (
            <div class="gallery__thumbs">
              {images.map((img, i) => (
                <button
                  type="button"
                  class={`thumb ${i === 0 ? 'is-active' : ''}`}
                  data-gallery-thumb={img.url}
                  data-alt={img.alt || p.title}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img src={img.url} alt="" width="120" height="120" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div class="pot__info">
          <a class="back" href="/shop">
            ← Shop
          </a>
          <h1>{p.title}</h1>
          <p class="pot__price">{soldOut ? 'Sold' : price(p.price_pence)}</p>
          {p.kind === 'oneoff' && !soldOut && <p class="muted">One of a kind</p>}
          <div class="pot__desc">
            {paragraphs(p.description).map((para) => (
              <p>{para}</p>
            ))}
          </div>

          {soldOut ? (
            <p class="muted">
              {p.kind === 'oneoff' ? 'This one has gone. ' : 'Out of stock for now. '}
              <a href="/commissions">Ask about a commission</a>
            </p>
          ) : (
            <form class="add" data-add-to-basket data-id={p.id} data-max={maxQty}>
              {p.kind === 'range' && maxQty > 1 && (
                <label class="add__qty">
                  <span class="visually-hidden">Quantity</span>
                  <select name="qty">
                    {Array.from({ length: maxQty }, (_, i) => (
                      <option value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </label>
              )}
              <button class="btn" type="submit">
                Add to basket
              </button>
              <p class="add__msg" data-add-msg role="status" aria-live="polite"></p>
            </form>
          )}

          <p class="small muted">
            {price(shippingPence)} UK delivery per order · <a href="/delivery-returns">Delivery &amp; returns</a>
          </p>
        </div>
      </article>
    </Layout>
  )
}
