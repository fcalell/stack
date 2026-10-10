---
id: 003-306
status: backlog
sessions: {}
---
# react-ui: a short Sheet draws centred on the desktop

## Goal
Stead's "Add a node" on the workflow canvas (`packages/server/src/app/routes/system/-components/add-node.tsx:79`) and its other short picks draw as a card hung at the top end of the page. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "modals should be centered". The owner rules a short pick a card centred over the page on the desktop; a long form stays the side sheet. Stead's `design/07-interface.md` ("The shell") now says so.

## Approach
003-147 (done) made a short desktop side sheet its content's height, hung from the top at the end edge (`LAYER_SIDE` `items-start justify-end`, `plugins/react-ui/src/ui/components/sheet/base.tsx:65-69`), and stood its look for the owner's sign-off; this is that ruling reversed. `SheetCentered` exists in ui-core's variants. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] On the desktop a Sheet whose body fits the viewport draws as a card centred over the page, with its submit in reach (003-292).
- [ ] A form past the viewport stays the full-height side sheet, its body scrolling.
- [ ] Touch is unchanged.

## Open questions
- [ ] Where the line between short and long falls, and whether it moves between the two as the form grows: the stack session decides.
