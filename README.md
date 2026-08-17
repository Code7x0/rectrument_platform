# Talent Platform

Next.js recruitment partner platform (Clerk + Airtable), deployed on Vercel.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Clerk authentication
- Airtable
- React Hook Form + Zod
- Framer Motion, Lucide, Sonner

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Fill in Clerk + Airtable values
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test:unit` | Unit tests |

## Roles

- `/admin` — Admin
- `/account-manager` — Account Manager
- `/partner` — Talent Partner
