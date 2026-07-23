# Features Shared Layer

Business-aware shared imports for feature modules.

Prefer importing from `@/features/shared` when a feature needs shared UI or lookups,
so module boundaries stay consistent as the app grows.

Truly primitive UI remains in `components/ui`.
Cross-cutting shell UI remains in `components/shared`.

## Re-exports

- Data tables & dialogs
- Lookup helpers / query keys
- Common empty/loading helpers
- Canonical entities (`./entities`) — Job, Allocation, Candidate, Submission, Partner, Client
