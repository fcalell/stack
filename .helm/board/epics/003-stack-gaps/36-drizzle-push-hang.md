---
id: 003-36
status: backlog
sessions: {}
---
# plugin-db: a second stack dev doesn't hang applying the schema

## Goal
With a local D1 that already holds data, `stack dev` stops at "Applying schema to local
database…": `drizzle-kit push` waits, likely on an interactive prompt. The worker still serves.
Found on `apps/phone` during 002-07.

## Acceptance criteria
- [ ] (live) `stack dev` run twice against the same local D1 reaches "Watching for changes" both times.
