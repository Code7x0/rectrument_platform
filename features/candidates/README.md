# Candidates Module

## Purpose

**Candidate = Person.**

Domain model for people in the talent pool. Never mixes with Submission (business event).

## Rules

- Duplicate detection by Email / Phone before create
- Resume via abstract upload service (Airtable Attachments today)
- No submission workflow here — that lives in `features/submissions`

## Structure

```
features/candidates/
  repositories/   # Airtable only
  services/       # create, duplicate search, resume attach
  schemas/
  types/          # re-exports CandidateEntity
  components/     # person forms / reuse dialogs
```

## Entity

Canonical model: `features/shared/entities/candidate.entity.ts`
