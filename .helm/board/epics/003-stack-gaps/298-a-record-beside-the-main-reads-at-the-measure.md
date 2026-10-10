---
id: 003-298
status: backlog
sessions: {}
---
# react-ui: a record beside the main reads at the measure

## Goal
Stead's Add a repo opens as a `Screen` in a Split's `beside` (`packages/server/src/app/routes/system/route.tsx:131,151`); at the desktop its Form and Prose stop at the measure while its Group, Code, ActionBar and section heads run the full width. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "add repo split: part of its body is full width, part is not".

## Approach
003-88 (done) capped a record in the Split's main (`SPLIT_MAIN` `rest` `max-w-measure-inset`, `packages/ui-core/src/variant-tables.ts:1177`). A `beside` Screen's body is `PAGE_BODY` with `SECTIONS_BESIDE` and no cap (`plugins/react-ui/src/ui/components/screen/index.tsx:195`, `packages/ui-core/src/variants.ts:852,889`). Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A record beside the main holds the same `measure-inset` column as one in the main: every block ends on one line.
- [ ] Native reads the same cell.

## Open questions
- [ ] Its shape: the stack session decides.
