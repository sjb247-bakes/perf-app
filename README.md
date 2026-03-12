# Performance & Mindset App

A personal performance tracking web app built with Next.js 14, Supabase, and Tailwind CSS.

## Stack
- **Frontend:** Next.js 14 (App Router)
- **Database & Auth:** Supabase
- **Styling:** Tailwind CSS + shadcn/ui
- **Email:** Resend
- **Cloud Sync:** Supabase Edge Functions

## Features
- 🔐 Auth (signup/login) via Supabase
- 📊 Dashboard — daily Garmin metrics (Sleep, HRV, Body Battery, Stress)
- 🔗 Integrations — connect Garmin (encrypted credential storage)
- 👤 Profile — notification preferences (Telegram / Email)
- ☁️ Edge Function — daily Garmin sync (replaces local Task Scheduler)

## Getting Started

```bash
npm install
cp .env.example .env.local  # fill in your Supabase + encryption keys
npm run dev
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_SECRET=
```

## Deploy Edge Function

See `supabase/functions/garmin-sync/DEPLOY.md` for full instructions.
