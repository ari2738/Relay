**live app**
https://relay-q2ec.onrender.com⁠�

# Relay — Community Accessibility Map

A community-driven map of step-free entrances, working elevators, accessible
restrooms, curb cuts, and temporary blockers — reported and verified by the
people who rely on them.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui ·
Drizzle ORM (Postgres) · SWR · Leaflet + OpenStreetMap · better-auth

## Getting started

```bash
npm install
cp .env.example .env   # fill in at least DATABASE_URL and BETTER_AUTH_SECRET
npm run db:push        # or db:generate + apply the SQL in drizzle/ yourself
npm run dev
```

## Environment variables

See `.env.example` for the full list with inline comments. Summary of what's
required vs optional:

| Variable | Required? | Effect if missing |
|---|---|---|
| `DATABASE_URL` | **Yes** | App won't start |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | **Yes** | Auth won't work |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | "Continue with Google" is hidden; email/password still works |
| `CLOUDINARY_*` | No | Photo uploads on reports are disabled |
| `ANTHROPIC_API_KEY` | No | AI accessibility scoring / spam detection / image validation fall back to deterministic rule-based logic |

## Database migrations

Every schema change made during development lives in `drizzle/` as a
numbered SQL migration.

```bash
npm run db:push     # dev — pushes the current schema directly
npm run db:generate # regenerate after changing lib/db/schema.ts
npm run db:studio   # browse the DB
```

## Roles

Three roles exist: `accessibility_user` (default), `volunteer`, and `admin`.
The first two are self-selectable at sign-up; `admin` is granted by another
admin from `/admin` (or directly in the database for the very first one).

## Notable design choices

- **Soft delete**: a user deleting their own report just flips `active` to
  `false`; admins can permanently purge from `/admin`.
- **AI features fail open**: if `ANTHROPIC_API_KEY` isn't set, or a call
  times out/fails, nothing blocks — reports still get created, images still
  upload, nothing gets wrongly flagged.
- **Duplicate detection**: geo-proximity (~40m) + same category, checked
  both client-side (fast UX) and server-side (source of truth) before a
  report is created.
