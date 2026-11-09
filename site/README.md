# Frank Pinsent – website & shop

Hono app on Cloudflare Workers (free tier):
- **D1** (SQLite) for pots, markets, commission enquiries and orders
- **R2** for photos uploaded through the admin (stage 2)
- **Square** for checkout and **Resend** for order emails (stage 3)

Running costs: £0, plus the domain. Square takes a fee per sale.

## Run it locally

```bash
cd site
npm install
npm run db:migrate:local   # create the tables in a local database
npm run db:seed:local      # load the sample pots (local only)
npm run dev                # http://localhost:8787
```

Secrets for local testing go in `site/.dev.vars`. Copy `.dev.vars.example` to create it. That file is git-ignored, so never commit real keys.

## Admin login

- **Live site:** Cloudflare Access protects `/admin`. Frank types his email and gets a one-time code, with no password to remember. The Worker also checks Access's signed token (`src/auth.ts`), so admin stays locked even if the Access policy is misconfigured. It needs `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` (set up in stage 4).
- **Locally:** `DEV_ADMIN_BYPASS=true` in `.dev.vars` lets you into http://localhost:8787/admin. It only works on localhost.

## Testing checkout with Square sandbox

1. In the [Square Developer dashboard](https://developer.squareup.com/apps), open your app and switch to **Sandbox**. Copy the **Sandbox access token** and, under **Locations**, the location ID.
2. Put them in `site/.dev.vars` as `SQUARE_ACCESS_TOKEN` and `SQUARE_LOCATION_ID`, with `SQUARE_ENV=sandbox`. Never commit this file or paste it anywhere.
3. Restart `npm run dev`, add pots to the basket and press **Checkout securely**. Pay with Square's test card `4111 1111 1111 1111`, any future expiry date, CVV `111` and any postcode.
4. **Webhooks need a public URL**, so Square can't reach localhost. Test them once the site is deployed (stage 4), or with `npx cloudflared tunnel --url http://localhost:8787`. Then, in Square **Webhooks**, add a subscription for `payment.updated` pointing at `https://<that-host>/api/square/webhook`. Copy its **signature key** into `SQUARE_WEBHOOK_SIGNATURE_KEY` and the same URL into `SQUARE_WEBHOOK_URL`.
5. **Emails:** put a Resend API key in `RESEND_API_KEY`. Until Frank's domain is verified in Resend, emails send from `onboarding@resend.dev` and **only reach the address that owns the Resend account**. Without a key, emails are just logged in the terminal.

Webhooks can be simulated locally without Square. See `scripts/webhook-test.mjs`.

## Layout

| Path | What |
|---|---|
| `src/index.tsx` | Routes |
| `src/db.ts` | Database queries |
| `src/views/` | Page templates (server-rendered JSX) |
| `src/admin.tsx`, `src/admin-db.ts` | Admin routes and queries |
| `public/admin.css`, `public/admin.js` | Admin styling, photo shrinking, delete confirmations |
| `public/styles.css` | All styling. Colour tokens are at the top |
| `public/basket.js` | Basket (kept in the visitor's browser), gallery, add-to-basket |
| `migrations/` | Database schema |
| `seed/seed.sql` | Sample data. **Local only** |

## Stages

1. ✅ Public site: image-led home, /shop, /about (bio + markets), /commissions (form), pot pages, basket, delivery/returns, privacy
2. ✅ Admin at `/admin`: add/edit/hide/reorder/delete pots, upload photos (shrunk in the browser, stored in R2), markets, commission enquiries, orders
3. ✅ Square hosted checkout, signed webhook (marks paid once, takes stock), Resend emails: new order to Frank, confirmation and "posted" to the customer, and commission enquiries to Frank
4. ✅ Deployment guide: see [DEPLOY.md](DEPLOY.md)
