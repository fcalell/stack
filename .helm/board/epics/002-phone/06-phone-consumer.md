---
id: 002-06
status: backlog
sessions: {}
---
# expo: a phone consumer in stack

## Goal
`apps/showcase` is web only, so stack holds no phone app: a broken entry or a React mismatch
passes `pnpm check`, and the harness has no target in the repo.

## Approach
A private consumer scaffolded by `stack init --plugins=native-ui` (or expo added to the
showcase; decide then), its type-check in `pnpm check`.

## Acceptance criteria
- [ ] (command) `pnpm check` type-checks the phone consumer.

## Open questions
- [ ] A second app or expo in the showcase.
