---
id: 003-302
status: backlog
sessions: {}
---
# react-ui: a canvas fills a Split's main to its edges

## Goal
Stead's workflow canvas opens in a Split's main (`packages/server/src/app/routes/system/-components/canvas.tsx`) and stands inside the page inset, under the record's header, rather than filling the pane. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "workflow canvas should fill the whole split pane".

## Approach
`Split` applies `splitMain({state:"rest"})` (`plugins/react-ui/src/ui/components/split/index.tsx:165-170`), `gap-sections p-page max-w-measure-inset` (`packages/ui-core/src/variant-tables.ts:1177`). The filled form (`thread/fill.ts:16-17`) lifts the gap, the bottom padding and the cap but keeps the side and top inset. 003-110 (done) took the measure off a canvas, not the inset; 003-202 (review) is the phone's height. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A canvas in a Split's main reaches the main's edges, with the record's header and acts over it, on the desktop and the tablet.
- [ ] A Thread's filled form is unchanged.

## Open questions
- [ ] Its shape (the `fills` state for a canvas, or the canvas lifting the inset): the stack session decides.
