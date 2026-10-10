---
id: 003-295
status: backlog
sessions: {}
---
# react-ui: a waiting form shows only for a read that lasts

## Goal
Stead's pages flash their skeletons: a read the local server answers in a few milliseconds still swaps the record for its waiting form and back, and a page with nested reads (System, Repos, `packages/server/src/app/routes/system/-components/repos.tsx`) flashes in waves. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "loading states flashing".

## Approach
`QueryBoundary` draws its waiting form the moment any query is pending (`plugins/react-ui/src/ui/components/query-boundary/index.tsx:59`), with no delay before it shows and no time it stays once shown. Stead reads its nested queries together on its side; the flash on a fast read is the boundary's. 003-127, 131, 132 and 179 shape the skeleton, not when it shows. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A read that settles under a short delay (about 150 to 300 ms) draws no waiting form.
- [ ] A waiting form once shown stays a minimum time, so it never blinks.
- [ ] A Field's or Group's own `loading` follows the same rule.

## Open questions
- [ ] Its shape (the delay and the minimum, a token or fixed): the stack session decides.
