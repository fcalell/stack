---
id: 003-298
status: review
sessions: {}
---
# react-ui: a record beside the main reads at the measure

## Goal
Stead's Add a repo opens as a `Screen` in a Split's `beside` (`packages/server/src/app/routes/system/route.tsx:131,151`); at the desktop its Form and Prose stop at the measure while its Group, Code, ActionBar and section heads run the full width. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "add repo split: part of its body is full width, part is not".

## Approach
003-88 (done) capped a record in the Split's main (`SPLIT_MAIN` `rest` `max-w-measure-inset`, `packages/ui-core/src/variant-tables.ts:1177`). A `beside` Screen's body is `PAGE_BODY` with `SECTIONS_BESIDE` and no cap (`plugins/react-ui/src/ui/components/screen/index.tsx:195`, `packages/ui-core/src/variants.ts:852,889`). Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A record beside the main holds the same `measure-inset` column as one in the main: every block ends on one line. (Built; the measure awaits the batch browser run.)
- [x] Native reads the same cell.

## Open questions
- [x] Its shape: the stack session decides.

## Ruled
No new surface: a `beside` Screen's body composes `PAGE_BODY` with one new cell, `PAGE_BODY_BESIDE` (`max-w-measure-inset`), which is the cap `SPLIT_MAIN` `rest` holds, so the two columns are one rule. `SPLIT_MAIN` itself is Split's (verify `b-holds` refuses another component importing it), hence the Screen's own cell.

## Built
- `packages/ui-core/src/variants.ts`: `PAGE_BODY_BESIDE`; roster: Screen draws it and owns `measure-inset`.
- `plugins/react-ui/src/ui/components/screen/index.tsx`: the beside body is `cn(PAGE_BODY, PAGE_BODY_BESIDE, SECTIONS_BESIDE)`; the column stands at the region's start, and the sections' page container is now the capped column.
- `plugins/native-ui/src/ui/components/screen/index.tsx`: the beside body's content container adds `PAGE_BODY_BESIDE`.
- Rules (react-ui, native-ui) and `ui-core.md` say the beside record holds the main's column.
- Evidence: `apps/showcase/behaviour/split-record.stories.tsx` `BesideRecordHoldsTheMeasure` (2000 px page; column width is `measure-inset`, starts at the region, every block ends at the Prose's end). Written, not run: it awaits the batch browser run.
- Native unrendered: the phone is narrower than the measure, so the cap is a no-op there until a wider surface; the cell is the same.
