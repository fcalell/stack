---
id: 003-37
status: backlog
sessions: {}
---
# plugin-db: the scaffolded schema re-exports auth's tables when auth is installed

## Goal
`plugins/db/guide/schema.md` says an app with auth re-exports `@fcalell/plugin-auth/schema`, but
the db plugin's `templates/schema.ts` leaves it out, so every scaffolded auth app starts off its
own guide. Found on `apps/phone` during 002-07.

## Approach
The re-export reaches the template through the slot graph (auth contributes it), never by cli or
db naming auth.

## Acceptance criteria
- [ ] (test) a scaffold with auth writes the re-export; one without does not.
