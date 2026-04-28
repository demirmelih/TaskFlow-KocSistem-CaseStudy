# TaskFlow

A lightweight Trello-style Kanban board. Sign up, create boards, drag cards across columns. Card order survives page reloads. Works on mobile via long-press to drag.

> Built as a 48-hour case study. The PRD and feature scope are in [`product_prd.md`](./product_prd.md). T

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Row Level Security) · dnd-kit · TanStack Query · react-hook-form + zod · shadcn/ui · Vitest · Playwright · Vercel.

## Features

- Email + password authentication (Supabase Auth)
- Boards: create, list, delete (your boards only — enforced by RLS at the database)
- Columns: create, rename inline, delete, drag to reorder
- Cards: create inline; edit title, description, deadline (date + time), and responsible person (name + email) in a dialog; delete; drag within a column or across columns
- Deadline badge on each card — amber when due within 24 h, red when overdue
- Responsible person badge on each card showing the assigned name
- Persistent ordering via fractional indexing (LexoRank-style) — no cascade writes when you drop a card between siblings
- Optimistic UI: drags feel instant regardless of network latency
- Mobile-friendly: long-press (200 ms) to start a drag, prevents accidental drags while scrolling
- Accessible: dnd-kit keyboard sensors enabled (Tab to focus, Space to pick up, arrows to move, Space to drop)

## Project structure

```
src/
├── app/                    # Next.js App Router (routing only — thin)
│   ├── (auth)/             # Login, signup
│   ├── boards/             # Boards list + board detail
│   └── page.tsx            # Landing
├── features/               # Feature-sliced (the meat of the app)
│   ├── auth/               # Components, server actions, schemas
│   ├── boards/
│   ├── columns/
│   └── cards/
├── components/
│   ├── ui/                 # shadcn-style primitives
│   ├── kanban/             # KanbanBoard (DnD context)
│   ├── layout/             # AppShell
│   └── providers/          # QueryProvider
├── lib/
│   ├── supabase/           # Browser client, server client, middleware
│   ├── ordering/           # fractional.ts + tests — pure ordering logic
│   └── utils.ts
├── types/                  # Database row types
└── middleware.ts           # Supabase session refresh + auth-gated routes
supabase/migrations/        # SQL schema + RLS policies
tests/e2e/                  # Playwright golden-path test
```

Each feature folder owns its own `components/`, `actions.ts` (Server Actions), `queries.ts`, and `schemas.ts` (zod). The `app/` layer only composes them.

## Local setup

Prerequisites: Node 20+ and a Supabase project (free tier is fine).

1. **Clone and install**

   ```bash
   git clone <repo-url> taskflow
   cd taskflow
   npm install
   ```

2. **Create a Supabase project**

   - Go to <https://supabase.com> → new project
   - Copy the project URL and the `anon` public key from Settings → API

3. **Apply the schema**

   In the Supabase SQL editor, paste and run the contents of:
   1. [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) — creates the three tables, indexes, the `updated_at` trigger, and the Row Level Security policies.
   2. [`supabase/migrations/0002_card_fields.sql`](./supabase/migrations/0002_card_fields.sql) — adds `deadline`, `responsible_name`, and `responsible_email` columns to `cards`.

4. **Wire env vars**

   ```bash
   cp .env.example .env.local
   # then edit .env.local with the URL + anon key from step 2
   ```

5. **Disable email confirmations (dev only)**

   In Supabase: Authentication → Providers → Email → toggle off "Confirm email" so you can sign up and log in immediately. (For production you'd leave this on and add a confirmation page.)

6. **Run**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest unit tests (fractional indexing) |
| `npm run test:e2e` | Run Playwright e2e tests |

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import into Vercel.
3. Add the two environment variables from `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. Add the Vercel URL to Supabase → Authentication → URL Configuration → Site URL.

## Testing

- **Unit (`npm test`):** `src/lib/ordering/fractional.test.ts` covers the ordering math — first key, key-before, key-after, key-between, repeated mid-inserts (the worst case for fractional indexing), and the `positionForIndex` helper that the drag handlers call.
- **End-to-end (`npm run test:e2e`):** Playwright signs in, creates a board, adds cards, drags one across columns, reloads, and verifies the position persisted.

## What was deliberately left out

See [`product_prd.md`](./product_prd.md) §4. Briefly: no realtime, no sharing, no labels, no activity log. Card deadlines and responsible-person fields are included; more advanced features (reminders, avatar photos, multiple assignees) remain out of scope.


