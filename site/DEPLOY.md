# Putting Frank's site live

Set aside an afternoon. Work through the steps in order. Each step says what you'll need and how to check it worked.

`frankpinsent.co.uk` is used as the example domain throughout. Swap in the real one.

## What it costs

| Thing | Cost |
|---|---|
| Domain (`.co.uk` through Cloudflare Registrar, sold at cost) | roughly £5–10 a year |
| Cloudflare Workers, D1 database, R2 photo storage, Access login | £0 on the free plans. A shop this size uses a tiny fraction of the limits |
| Resend emails | £0 up to 3,000 a month (100 a day) |
| Square | No monthly fee. Square takes a fee on each sale (check their current UK online rate). Nothing to pay when nothing sells |

> **Card on file:** Cloudflare asks for a payment card before switching on R2 (and sometimes Zero Trust), even on the free plan. You won't be charged unless the free limits are exceeded, which this site won't get near. You can set a billing alert in **Manage account → Billing** for peace of mind.

## Accounts you'll use

Make these in **Frank's name or a shared email you both control**, not a personal one you might lose:

- **Cloudflare** (hosting, domain, admin login). You've made this already.
- **Square**: must be **Frank's own seller account**, because the money is paid out to the bank account on it.
- **Resend** (emails).
- **GitHub** (optional, for automatic deploys and a backup of the code).

---

## 1. Put the code on GitHub (optional, recommended)

The code stays private, you get a backup, and Cloudflare can deploy automatically every time you push.

```bash
cd site
git init
git add .
git commit -m "Frank Pinsent website"
```

Create a **private** repository on GitHub called `frank-pinsent-pottery`, then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/frank-pinsent-pottery.git
git branch -M main
git push -u origin main
```

Before pushing, check that `git status` does **not** list `.dev.vars`. It's in `.gitignore`, but it holds secrets, so it's worth a look.

## 2. Log Wrangler in to Cloudflare

```bash
cd site
npx wrangler login
```

A browser window opens. Approve it. Check it worked with `npx wrangler whoami`.

## 3. Create the database and photo storage

```bash
npx wrangler d1 create frank-db
```

This prints a `database_id`. Copy it into `wrangler.jsonc` in place of `REPLACE_WITH_D1_ID`.

```bash
npx wrangler r2 bucket create frank-media
npm run db:migrate:remote
```

`db:migrate:remote` creates the empty tables. **Don't** run the seed file against the live database. That's sample data. Frank adds the real pots in admin.

## 4. First deploy

```bash
npm run deploy
```

Wrangler prints an address like `https://frank-pinsent-pottery.YOURNAME.workers.dev`. Open it. You should see the homepage and an empty shop.

`/admin` will say **"Admin is locked"** for now. That's correct: it stays locked until step 6.

## 5. Get the domain

1. In Cloudflare go to **Domain Registration → Register Domains**, search for the name and buy it. Cloudflare sells at cost, with no markup and no renewal hikes.
2. If you already bought it elsewhere, use **Add a site** in Cloudflare instead. It then tells you to change the domain's nameservers at the old registrar to Cloudflare's. That can take a few hours.

## 6. Admin login (Cloudflare Access)

This puts a login screen in front of `/admin`. Frank types his email and gets a 6-digit code, so there's no password to forget.

1. In the Cloudflare dashboard open **Zero Trust**. First time in, pick a **team name** (for example `frankpinsent`) and the **Free** plan.
2. **Access → Applications → Add an application → Self-hosted**.
   - Application name: `Frank admin`
   - Session duration: 1 month (so Frank isn't asked for a code every day)
   - Domain: `frankpinsent.co.uk`, path: `admin`
3. Add a **policy**: Action **Allow**, Include **Emails**, then Frank's email address and yours.
4. Login method: leave **One-time PIN** ticked.
5. Save. Open the application again and copy the **Application Audience (AUD) Tag**.
6. Your **team domain** is `YOURTEAM.cloudflareaccess.com`. You'll find it under **Settings → Custom pages**, or in the login page's address.

Give these to the site as secrets:

```bash
npx wrangler secret put ACCESS_TEAM_DOMAIN
```

Paste `frankpinsent.cloudflareaccess.com` (no `https://`).

```bash
npx wrangler secret put ACCESS_AUD
```

Paste the AUD tag.

> The site checks Access's signed token on every admin request as well. If the Access settings were ever wrong, admin would show "Forbidden" rather than being open.

## 7. Point the site at the domain

In `wrangler.jsonc`, uncomment the block at the bottom: `routes`, `workers_dev`, `preview_urls`. Put your domain in `routes`, and add a comma after the `observability` line. Then:

```bash
npm run deploy
```

Cloudflare sets up the domain and its HTTPS certificate automatically. Allow a few minutes.

**Check it:**
- The shop loads at `https://frankpinsent.co.uk`.
- `https://frankpinsent.co.uk/admin` shows the Cloudflare login. Enter Frank's email, type the code, and you're in.
- In a private window, `https://frankpinsent.co.uk/admin/markets` also asks for the login.

## 8. Emails (Resend)

1. In Resend go to **Domains → Add domain** and enter `frankpinsent.co.uk`. Region: **Ireland (eu-west-1)**, which keeps data in Europe.
2. Resend shows a few DNS records. Because the domain is on Cloudflare, use **Resend's automatic Cloudflare setup** if it offers one. Otherwise add each record in **Cloudflare → DNS**, set to **DNS only** (grey cloud).
3. Wait for Resend to say **Verified** (usually minutes).
4. **API Keys → Create** a key with "Sending access" for this domain only.

```bash
npx wrangler secret put RESEND_API_KEY
```

Paste the key straight into the terminal. Don't save it anywhere else.

```bash
npx wrangler secret put EMAIL_FROM
```

Enter `Frank Pinsent <orders@frankpinsent.co.uk>`.

```bash
npx wrangler secret put ORDER_NOTIFY_EMAIL
```

Enter the address that should get new orders and enquiries. That's yours for now; change it to Frank's later with the same command.

**Check it:** send a test enquiry from the Commissions page. It should arrive within a minute. Replying to it goes to the person who sent it.

## 9. Square: take real payments

The developer app must belong to **Frank's** Square account, so log in to <https://developer.squareup.com> **with Frank's Square login**.

1. Finish setting up Frank's Square account first (identity check and bank details). Square won't pay out until this is done.
2. **Create an app** (any name, for example `Website`). Switch to **Production**.
3. Copy the **Production access token**. Under **Locations**, copy the location ID.
4. In the app, go to **Webhooks → Subscriptions → Add subscription** (Production):
   - URL: `https://frankpinsent.co.uk/api/square/webhook`
   - Event: `payment.updated`
   - Save, then copy the **Signature key**.

Set these secrets:

```bash
npx wrangler secret put SQUARE_ENV
```

Enter `production`.

```bash
npx wrangler secret put SQUARE_ACCESS_TOKEN
```

```bash
npx wrangler secret put SQUARE_LOCATION_ID
```

```bash
npx wrangler secret put SQUARE_WEBHOOK_SIGNATURE_KEY
```

```bash
npx wrangler secret put SQUARE_WEBHOOK_URL
```

Enter exactly `https://frankpinsent.co.uk/api/square/webhook`. It must match the URL in Square character for character, or every payment notification is rejected.

> **Want a dress rehearsal first?** Do steps 2–4 with Square's **Sandbox** tab instead and set `SQUARE_ENV` to `sandbox`. Pay with the test card `4111 1111 1111 1111`, any future expiry, CVV `111`. Then switch every value to Production.

## 10. Launch checklist

Do a real end-to-end test before telling anyone:

- [ ] Frank logs in to `/admin` on his phone and adds a pot with photos. It appears in the shop.
- [ ] Buy something cheap with a real card: add a £1 test pot, then hide it afterwards.
  - [ ] You land on the Thank you page and the basket is empty.
  - [ ] The "New order" email arrives with the address.
  - [ ] The customer confirmation email arrives, plus Square's receipt.
  - [ ] The order is in **Admin → Orders** and the pot's stock went down.
  - [ ] **Mark as posted** sends the "on its way" email.
  - [ ] Refund the test payment in the Square dashboard.
- [ ] Commission form: the email arrives and the enquiry shows in admin.
- [ ] Read **Delivery & returns** and **Privacy** together and make sure Frank is happy with them (posting times, breakages, the 14-day returns wording).
- [ ] Add some markets in admin, or check About says "Nothing booked at the moment".

## Day-to-day

- **Frank's routine:** add and edit pots, mark orders posted and reply to enquiries, all at `frankpinsent.co.uk/admin`.
- **Changing the code:** edit, then `npm run deploy`. With GitHub connected, you can instead go to **Workers & Pages → frank-pinsent-pottery → Settings → Build** and connect the repo; then pushing to `main` deploys.
- **Homepage photos:** these are fixed in the code (`src/views/home.tsx`, files in `public/img/`), not in admin.
- **Database changes:** add a new file in `migrations/`, then run `npm run db:migrate:remote`.
- **Something broke?** **Workers & Pages → frank-pinsent-pottery → Logs** shows errors, including failed Square or Resend calls.
- **Backups:** D1 keeps 30 days of point-in-time history automatically (**D1 → frank-db → Time Travel**).
- **Square fees and payouts:** these appear in Frank's Square dashboard, not in the site.
- **Orders from outside the UK:** Square's checkout can't be limited to UK addresses. If one comes in, refund it from Square.

## All the secrets in one place

| Name | Example | From |
|---|---|---|
| `ACCESS_TEAM_DOMAIN` | `frankpinsent.cloudflareaccess.com` | Zero Trust |
| `ACCESS_AUD` | long hex string | Access application |
| `SQUARE_ENV` | `production` | |
| `SQUARE_ACCESS_TOKEN` | `EAAA…` | Square app → Production |
| `SQUARE_LOCATION_ID` | `L…` | Square app → Locations |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | | Square → Webhooks |
| `SQUARE_WEBHOOK_URL` | `https://frankpinsent.co.uk/api/square/webhook` | |
| `RESEND_API_KEY` | `re_…` | Resend → API Keys |
| `EMAIL_FROM` | `Frank Pinsent <orders@frankpinsent.co.uk>` | |
| `ORDER_NOTIFY_EMAIL` | where order emails go | |

`npx wrangler secret list` shows which ones are set (not their values).
