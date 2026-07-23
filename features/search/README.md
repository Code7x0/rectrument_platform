# Global Search

## Purpose

Permission-aware command-palette search across platform entities.

Keyboard: **⌘K / Ctrl+K**

Routes: `/search`, `/search?q=`

## Structure

```
features/search/
  repositories/   # no Airtable table — orchestration only
  services/       # GlobalSearchService + ranking + URLs
  actions/
  components/     # Modal, page, chips, results
  hooks/          # Recent searches (localStorage)
  schemas/
  types/
```

## Behaviour

- Debounced server action search
- Parallel segment queries via existing feature services
- Role-scoped results (never leaks inaccessible entities)
- Recent searches in localStorage (max 10)
- Filters as chips; groups with “View all”

## Permissions

| Role | Scope |
|------|--------|
| Super Admin | All searchable entities + settings |
| Admin | Business entities + settings |
| Account Manager | Assigned jobs / related entities |
| Talent Partner | Own allocations, submissions, documents, payouts, notifications |

## Production Recommendations

Airtable is not a search index. Current search filters in memory / formula `FIND` after scoped list fetches.

Do **not** implement without approval:

1. Dedicated search index (Typesense / Meilisearch / OpenSearch)
2. Airtable formula indexes / computed search fields
3. Cursor-based pagination for search segments
4. Cross-entity denormalized search table
5. Highlighting via server-side snippets
