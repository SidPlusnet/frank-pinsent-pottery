import type { FC } from 'hono/jsx'
import { dateRange, price } from '../format'
import type { MarketEvent, Product } from '../types'
import { INSTAGRAM, Layout, ProductCard } from './components'

// ---------- Shop ----------

export const ShopPage: FC<{ products: Product[]; shippingPence: number }> = ({ products, shippingPence }) => {
  const range = products.filter((p) => p.kind === 'range')
  const oneoffs = products.filter((p) => p.kind === 'oneoff')
  return (
    <Layout title="Shop" active="shop">
      <section class="page page--wide">
        <header class="page-head">
          <h1>Shop</h1>
          <p class="muted">UK delivery {price(shippingPence)} per order</p>
        </header>
        {products.length === 0 && <p class="muted">Nothing in the shop just now. New pots are on the way.</p>}
        {range.length > 0 && (
          <div class="shelf">
            {oneoffs.length > 0 && <h2 class="label">Always available</h2>}
            <div class="grid">
              {range.map((p) => (
                <ProductCard p={p} />
              ))}
            </div>
          </div>
        )}
        {oneoffs.length > 0 && (
          <div class="shelf">
            <h2 class="label">One-offs</h2>
            <div class="grid">
              {oneoffs.map((p) => (
                <ProductCard p={p} />
              ))}
            </div>
          </div>
        )}
      </section>
    </Layout>
  )
}

// ---------- About ----------

export const AboutPage: FC<{ events: MarketEvent[] }> = ({ events }) => (
  <Layout title="About" active="about">
    <section class="page page--wide about">
      <img class="about__photo" src="/img/frank/headphones.webp" alt="Frank finishing pots at the wheel" width="2096" height="1676" />
      <div class="about__text">
        <h1>About</h1>
        <p>
          Having graduated from the Ruskin School of Art in 2017, I pursued a career as a painter before finding ceramics. I was
          apprenticed to Penny Simpson for a year before coming to Whichford Pottery, where I have worked as a production potter for
          the last 4 years.
        </p>
        <p>
          I am an earthenware potter, and my practice has its roots and inspiration in the English slipware tradition. In particular, I
          rely on the technique of slip trailing, using contrasting black and white slip to decorate my pots.
        </p>
        <p>
          I make the majority of my work on a Leach kickwheel, but I prefer to make small bowls and plates with a slab-roller. The clay
          I use to make my work, which mainly consists of mugs, plates, vases, teaware and small animal figurines, I collect locally and
          process in my back garden entirely by hand and without machinery.
        </p>

        <h2 class="label">Markets &amp; fairs</h2>
        {events.length > 0 ? (
          <ul class="events">
            {events.map((e) => (
              <li>
                <span class="events__date">{dateRange(e.starts_on, e.ends_on)}</span>
                <span>
                  {e.link ? (
                    <a href={e.link} rel="noopener" target="_blank">
                      {e.title}
                    </a>
                  ) : (
                    e.title
                  )}
                  {e.location && <span class="muted">, {e.location}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted">Nothing booked at the moment.</p>
        )}
        <p>
          <a href={INSTAGRAM} rel="noopener" target="_blank">
            @frankpinsent
          </a>
        </p>
      </div>
    </section>
  </Layout>
)

// ---------- Commissions ----------

export const CommissionsPage: FC<{ state?: 'sent' | 'error' }> = ({ state }) => (
  <Layout title="Commissions" active="commissions">
    <section class="page page--wide commissions">
      <img class="commissions__photo" src="/img/new/n20.webp" alt="A set of slip-trailed beakers" width="1080" height="1080" />
      <div>
        <h1>Commissions</h1>
        <p class="muted">Sets, gifts, names, special occasions. Tell me what you have in mind.</p>

        {state === 'sent' ? (
          <p class="notice" role="status">
            Thank you. I'll be in touch by email.
          </p>
        ) : (
          <form class="form" method="post" action="/commissions">
            {state === 'error' && (
              <p class="notice notice--error" role="alert">
                Please check your name, email and message.
              </p>
            )}
            <label>
              Name
              <input name="name" required maxlength={100} autocomplete="name" />
            </label>
            <label>
              Email
              <input name="email" type="email" required maxlength={200} autocomplete="email" />
            </label>
            <label>
              What would you like?
              <textarea name="idea" required maxlength={3000} rows={5}></textarea>
            </label>
            <div class="form__row">
              <label>
                Budget
                <select name="budget">
                  <option value="">Not sure</option>
                  <option>Under £50</option>
                  <option>£50 to £150</option>
                  <option>£150 to £300</option>
                  <option>Over £300</option>
                </select>
              </label>
              <label>
                Needed by
                <input name="timescale" maxlength={100} />
              </label>
            </div>
            <label class="hp" aria-hidden="true">
              Leave this empty
              <input name="website" tabindex={-1} autocomplete="off" />
            </label>
            <button class="btn" type="submit">
              Send
            </button>
          </form>
        )}
      </div>
    </section>
  </Layout>
)
