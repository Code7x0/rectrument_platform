# Recruiting Partner Management System

Production-ready foundation for a Recruitment Partner Management SaaS built with Next.js 15.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Clerk Authentication
- Airtable SDK
- TanStack Query + Axios
- React Hook Form + Zod
- Sonner, Framer Motion, Lucide

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
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm typecheck` | TypeScript check |

## Architecture notes

- Public routes: `/`, `/sign-in`, `/sign-up`
- Protected route groups: `/admin`, `/account-manager`, `/partner`
- Airtable client lives in `lib/airtable` — no business logic
- Domain types live in `types/` as placeholders
- Role-based access control is intentionally not implemented yet
