import type { FC } from 'hono/jsx'
import { price } from '../format'
import { Layout } from './components'

export const BasketPage: FC<{ shippingPence: number }> = ({ shippingPence }) => (
  <Layout title="Basket" active="basket">
    <section class="page basket">
      <h1>Basket</h1>
      <div id="basket-root" data-shipping={shippingPence}>
        <noscript>
          <p>The basket needs JavaScript switched on, sorry.</p>
        </noscript>
        <p class="muted">Loading…</p>
      </div>
    </section>
  </Layout>
)

export const NotFoundPage: FC = () => (
  <Layout title="Not found">
    <section class="page">
      <h1>Page not found</h1>
      <p>
        <a href="/shop">Go to the shop</a>
      </p>
    </section>
  </Layout>
)

export const DeliveryReturnsPage: FC<{ shippingPence: number }> = ({ shippingPence }) => (
  <Layout title="Delivery & returns">
    <section class="page prose">
      <h1>Delivery &amp; returns</h1>

      <h2>Delivery</h2>
      <p>
        I post to UK addresses only. Delivery is a flat {price(shippingPence)} per order, however many pots are in it. Every pot is wrapped
        carefully by me and sent with a tracked service. Pots in stock are usually posted within 5 working days. I'll email you when
        yours is on its way.
      </p>
      <p>Commissions are posted when they're ready, on the timescale we agree together.</p>

      <h2>If something arrives broken</h2>
      <p>
        I pack things well, but now and then the post wins. If your pot arrives damaged, please get in touch within 48 hours with a
        photo of the pot and the packaging. I'll send a replacement or a full refund, whichever you prefer.
      </p>

      <h2>Changing your mind</h2>
      <p>
        You can cancel your order for any reason within 14 days of receiving it. Just let me know within those 14 days, then send the
        pot back within a further 14 days. Once it's back with me (or you've shown me proof of postage), I'll refund the price of the
        pot and the original delivery charge within 14 days, to the card you paid with.
      </p>
      <p>
        You'll need to pay for return postage unless the pot was faulty or damaged. Please pack it carefully, because I can't refund
        pots that are broken on the way back.
      </p>
      <p>
        Commissions and personalised pieces are made to your own specification, so they can't be returned for a change of mind. This
        doesn't affect your rights if something is faulty.
      </p>

      <h2>Handmade pots</h2>
      <p>
        Everything is made and decorated by hand, so drips, glaze runs, finger marks and small variations in size and colour are part of
        each pot's character, not faults. Photos are of the actual pot for one-offs, and of a typical example for pots made in batches.
      </p>
      <p>
        Earthenware is food-safe and fine for everyday use. Hand washing will keep it looking good for longer. Please don't put it in the
        oven or on a direct flame.
      </p>

      <h2>Get in touch</h2>
      <p>
        Use the <a href="/commissions">contact form</a>.
      </p>
      <p class="small">Frank Pinsent, sole trader, Cotswolds, UK.</p>
    </section>
  </Layout>
)

export const PrivacyPage: FC = () => (
  <Layout title="Privacy">
    <section class="page prose">
      <h1>Privacy</h1>
      <p>
        This is a small, one-person shop, and I keep as little information about you as I can. Frank Pinsent (sole trader) is
        responsible for the information described here.
      </p>

      <h2>What I collect and why</h2>
      <ul>
        <li>
          <strong>When you buy something:</strong> your name, email, delivery address and what you ordered. I use these to send your
          pots and to email you about your order.
        </li>
        <li>
          <strong>When you send a commission enquiry:</strong> your name, email and message, so I can reply.
        </li>
      </ul>
      <p>I don't send marketing emails, and I never sell or share your details with anyone for marketing.</p>

      <h2>Payments</h2>
      <p>
        Payments are handled by <a href="https://squareup.com/gb/en/legal/general/privacy" rel="noopener">Square</a>. You enter your card
        details on Square's secure checkout, and they never pass through or get stored on this website.
      </p>

      <h2>Who else is involved</h2>
      <ul>
        <li>Square: takes payments.</li>
        <li>Cloudflare: hosts this website and stores order details securely.</li>
        <li>Resend: sends order confirmation emails.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        This site doesn't use tracking or advertising cookies. Your basket is saved in your own browser so it's still there if you come
        back later, and it never leaves your device until you check out.
      </p>

      <h2>How long I keep it</h2>
      <p>
        Order records are kept for 6 years, because HMRC requires it. Commission enquiries are deleted after 2 years unless they turn
        into an order.
      </p>

      <h2>Your rights</h2>
      <p>
        Under UK data protection law you can ask to see the information I hold about you, have it corrected, or have it deleted (except
        where I must keep it for tax). Just get in touch using the <a href="/commissions">contact form</a>. If you're unhappy with how I've handled your data, you can complain to the{' '}
        <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">
          Information Commissioner's Office
        </a>
        .
      </p>
    </section>
  </Layout>
)

export const ThanksPage: FC<{ found: boolean }> = ({ found }) => (
  <Layout title="Thank you">
    <section class="page" data-clear-basket={found ? '' : undefined}>
      <h1>Thank you</h1>
      {found ? (
        <>
          <p>Your order is in. A confirmation email is on its way, and I'll email you again when your pots are posted.</p>
          <p class="muted">Square will also send you a receipt for the payment.</p>
        </>
      ) : (
        <p>If you've just paid, a confirmation email is on its way.</p>
      )}
      <p>
        <a href="/shop">Back to the shop</a>
      </p>
    </section>
  </Layout>
)
