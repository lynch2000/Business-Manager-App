# HVAC Business Manager

A business management app for a heating & air conditioning company: customers,
quotations, invoices, debtors/creditors, and service reminders — built as an
installable web app (PWA) so it goes straight onto your iPhone home screen,
with a clean data layer so it can be rebuilt as a native Swift app later
without redesigning the backend.

## Stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS, installable as a PWA
- **Backend**: [Supabase](https://supabase.com) — Postgres database, auth, file
  storage, and an Edge Function for sending email
- **Email**: [Resend](https://resend.com), called from a Supabase Edge Function
- **PDFs**: generated on-device with jsPDF

Because the backend is a plain Postgres database behind Supabase's REST API,
a future native Swift app can talk to the exact same backend — no rebuild
needed there.

## 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project
   (pick a region close to Ireland, e.g. `eu-west-1`).
2. In **Project Settings → API**, copy the **Project URL** and **anon public
   key**.
3. Open the **SQL Editor** and run the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates all tables, row-level security policies, the document
   numbering function, and a `logos` storage bucket.
   - Alternatively, if you have the [Supabase CLI](https://supabase.com/docs/guides/cli)
     installed: `supabase link --project-ref <your-ref>` then `supabase db push`.
4. In **Authentication → Providers**, email/password sign-in is enabled by
   default — that's all this app uses (it's built for a single business
   owner, but is scoped per-user so it would support more logins later).

## 2. Configure the app

Copy `.env.example` to `.env.local` and fill in your project's values:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open the printed URL, sign up with your email, and you're in. The first
sign-in creates your `business_settings` row automatically — fill in your
business name, VAT number, and IBAN/BIC in **More → Business settings**.

## 3. Set up email sending (quotes, invoices, bank details)

Sending documents by email goes through a Supabase Edge Function
(`supabase/functions/send-email`) so your Resend API key never sits in the
app itself.

1. Create a free account at [resend.com](https://resend.com) and either
   verify your own domain or use their `onboarding@resend.dev` sender for
   testing.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in.
3. Deploy the function and set its secrets:

   ```bash
   supabase link --project-ref <your-ref>
   supabase functions deploy send-email
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set FROM_EMAIL="Your Business <billing@yourdomain.com>"
   ```

**If you skip this step**, the app still works: "Send to customer" and "Send
bank details" fall back to the iOS/Safari share sheet (pick Mail, WhatsApp,
etc. with the PDF attached) or, as a last resort, download the PDF and open
your mail app with the message pre-filled so you can attach it yourself.

## 4. Get it on your iPhone

1. Deploy the built app somewhere with HTTPS — [Vercel](https://vercel.com) or
   [Netlify](https://netlify.com) both have a free tier that works well with
   Vite (`npm run build`, publish the `dist/` folder). Set the same
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as environment variables
   there.
2. On your iPhone, open the deployed URL in **Safari**.
3. Tap the Share icon → **Add to Home Screen**.

It now behaves like an installed app: its own icon, no browser chrome, and
it keeps working offline for pages you've already loaded.

## Data model

| Table              | Purpose                                                        |
| ------------------ | ---------------------------------------------------------------- |
| `business_settings` | Your business details, VAT rate, IBAN/BIC, numbering prefixes  |
| `customers`         | Customer contact details                                       |
| `quotes` / `quote_items`     | Quotations, with line items and status (draft/sent/accepted/…) |
| `invoices` / `invoice_items` | Invoices, with line items and status                    |
| `payments`          | Payments recorded against an invoice (part-payments supported) |
| `creditors`         | Bills you owe to suppliers                                     |
| `service_records`   | Servicing history per customer, with an auto-computed next-due date |

Every table is scoped by `user_id` with row-level security, so your data is
private to your login.

## Roadmap ideas (not built yet)

- Automatic reminder emails (a scheduled Edge Function / `pg_cron` job that
  emails you when a service is due, rather than only showing it on the
  Dashboard)
- Multi-user / multi-technician support
- Native Swift/SwiftUI app reusing this same Supabase backend

## Future native iOS app

Because all data access goes through Supabase's REST/PostgREST API and Auth,
a native Swift app can be built later using the
[supabase-swift](https://github.com/supabase/supabase-swift) client against
this exact same project — no backend changes required.
