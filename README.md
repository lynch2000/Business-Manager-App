# HVAC Business Manager

A business management app for a heating & air conditioning company: customers,
quotations, invoices, debtors/creditors, expenses/receipts, and service
reminders — built as an installable web app (PWA) so it goes straight onto
your iPhone home screen, with a clean data layer so it can be rebuilt as a
native Swift app later without redesigning the backend.

## Stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS, installable as a PWA
- **Backend**: [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
  — the API lives in [`functions/`](functions) and deploys alongside the
  static site, same origin, no separate service to run
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **File storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) —
  business logo and receipt photos
- **Auth**: a small hand-rolled email/password system (PBKDF2 password
  hashing + signed JWTs), since this is a single-owner app and doesn't need
  a full auth-as-a-service
- **Email**: [Resend](https://resend.com), called from a Pages Function
- **Receipt scanning**: [Claude](https://console.anthropic.com) vision,
  called from a Pages Function
- **PDFs**: generated on-device with jsPDF

There's no database-level row security here the way Postgres/Supabase had it
— D1 doesn't have an equivalent. Instead, every API route in `functions/`
checks the signed-in user's ID against the data before returning or writing
anything (see `functions/_lib/tables.ts`). Because the whole backend is a
plain JSON API behind a JWT, a future native Swift app can call it directly
with nothing more than `URLSession` — no client SDK required.

## 1. Install the Cloudflare CLI and log in

```bash
npm install
npx wrangler login
```

This opens a browser to authorize Wrangler (Cloudflare's CLI) against your
Cloudflare account. Everything below uses `npx wrangler ...` — if you'd
rather not type `npx` every time, `npm install -g wrangler` works too.

## 2. Create the database

```bash
npx wrangler d1 create hvac-business-manager-db
```

This prints a `database_id`. Open [`wrangler.toml`](wrangler.toml) and paste
it in place of `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Then load the schema:

```bash
npx wrangler d1 execute hvac-business-manager-db --remote --file=./d1/schema.sql
```

(`--remote` applies it to the real, hosted database — use `--local` instead
if you're only testing locally with `npm run cf:dev` first.)

## 3. Create the file storage bucket

```bash
npx wrangler r2 bucket create hvac-business-manager-files
```

The name in `wrangler.toml`'s `[[r2_buckets]]` block already matches this —
only change it if you picked a different bucket name above.

## 4. Set secrets

These are per-environment secrets, not committed to git:

```bash
# Required — signs login sessions and file-sharing links. Any long random string.
npx wrangler pages secret put JWT_SECRET
npx wrangler pages secret put FILE_SIGNING_SECRET
```

The two below are optional — skip them for now and the app still works (see
the notes under each feature further down):

```bash
# Emailing quotes/invoices/bank details
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put FROM_EMAIL      # e.g. "Lynch Heating & Cooling <billing@yourdomain.com>"

# Automatic receipt scanning
npx wrangler pages secret put ANTHROPIC_API_KEY
```

For `JWT_SECRET` / `FILE_SIGNING_SECRET`, anything long and random works —
e.g. generate one with `openssl rand -hex 32` and paste it in when prompted.

## 5. Deploy

```bash
npm run deploy
```

This builds the app and runs `wrangler pages deploy`. The first time, it'll
ask you to create a new Pages project (accept the suggested name, or pick
your own) — after that it prints your live URL, something like
`https://hvac-business-manager.pages.dev`.

Open that URL. Since no account exists yet, the login screen shows a
one-time **"set up your account"** form instead of sign-in — enter your
email and a password to create the one owner login for this app. After that
first setup, the same screen always shows normal sign-in.

Fill in your business name, VAT number, and IBAN/BIC in **More → Business
settings**.

### Local development

```bash
npm run cf:dev
```

Runs the built app against a local D1 database (auto-created by Wrangler on
first run — apply the schema to it with the `--local` flag shown in step 2)
and a local R2 emulation, so you can try things out before deploying.

## 6. Get it on your iPhone

1. On your iPhone, open your deployed `*.pages.dev` URL in **Safari**.
2. Tap the Share icon → **Add to Home Screen**.

It now behaves like an installed app: its own icon, no browser chrome, and
it keeps working offline for pages you've already loaded.

## Email sending (quotes, invoices, bank details)

**If you skipped `RESEND_API_KEY`**, the app still works: "Send to customer"
and "Send bank details" fall back to the iOS/Safari share sheet (pick Mail,
WhatsApp, etc. with the PDF attached) or, as a last resort, download the PDF
and open your mail app with the message pre-filled so you can attach it
yourself. Set the secret later (step 4) any time you want one-tap sending —
no redeploy needed, Pages Functions pick up new secrets immediately.

## Receipt scanning (Expenses & Accounts)

The "Add receipt" flow (reachable from **Expenses → Add expense** or
**Accounts → Creditors → Scan a docket**) lets you take a photo, choose one
from your Photos library, or upload a file (photo or PDF) from the Files
app. It uploads to R2 and, if `ANTHROPIC_API_KEY` is set, sends it to Claude
to automatically read the vendor, date, amount, VAT, and a likely category —
you review and correct before saving, so a misread number never sneaks into
your records. On the review screen you choose whether it's something
**already paid** (saved to Expenses) or **not paid yet** (saved to Accounts
→ Creditors as a bill you owe), either way keeping the photo attached.

**If you skipped `ANTHROPIC_API_KEY`**, photo/file capture and storage still
work — the app just leaves the vendor/amount/date fields blank for you to
fill in by hand instead of pre-filling them.

## Data model

| Table                         | Purpose                                                         |
| ------------------------------ | ---------------------------------------------------------------- |
| `users`                       | The one business-owner login (email + hashed password)          |
| `business_settings`           | Your business details, VAT rate, IBAN/BIC, numbering prefixes   |
| `customers`                   | Customer contact details                                        |
| `quotes` / `quote_items`      | Quotations, with line items and status (draft/sent/accepted/…)  |
| `invoices` / `invoice_items`  | Invoices, with line items and status                            |
| `payments`                    | Payments recorded against an invoice (part-payments supported)  |
| `creditors`                   | Unpaid bills you owe to suppliers, optionally with a receipt photo |
| `expenses`                    | Receipts/dockets for things already paid for, optionally with a photo |
| `service_records`             | Servicing history per customer, with an auto-computed next-due date |

Every table is scoped by `user_id`, enforced in `functions/api/[table].ts`
and `functions/_lib/tables.ts` — see those files for exactly how each table
is authorized. Receipt photos live in a private R2 prefix and are only ever
viewed via short-lived signed URLs (`functions/api/files/sign.ts`); the
business logo is served without a signature since it isn't sensitive.

## How the API is organized

```
functions/
  api/
    auth/          setup (first-run bootstrap), login, me, status
    files/
      sign.ts       issues signed URLs for the private receipts bucket
      [bucket]/[[path]].ts   upload / stream / delete objects in R2
    [table].ts      generic list/create/update/delete for every data table
    send-email.ts
    parse-receipt.ts
    next-document-number.ts   atomic Q-/INV- number allocation
  _lib/             shared auth, D1 query, and table-config helpers
```

The frontend's `src/lib/db.ts` is a small chainable query-builder shim
(`db.from('customers').select('*').eq(...)`) that mirrors just enough of the
supabase-js API this app used previously, so most page components didn't
need to change beyond swapping the import.

## Roadmap ideas (not built yet)

- Automatic reminder emails (a Cron Trigger that emails you when a service
  is due, rather than only showing it on the Dashboard)
- Multi-user / multi-technician support (the schema already scopes
  everything by `user_id`, so this is mostly an auth/UI change)
- Native Swift/SwiftUI app calling this same JSON API directly

## Future native iOS app

Because the backend is a plain JSON API secured by a JWT (no Postgres client,
no vendor SDK), a future Swift app can talk to it with nothing more than
`URLSession` and a bearer token from `/api/auth/login` — the same endpoints
this web app uses.
