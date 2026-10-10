---
id: 003-299
status: backlog
sessions: {}
---
# react-ui: the focus ring sits on the edge, and a click draws a quiet one

## Goal
Stead's owner finds the focus ring intrusive. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "should the current blue focus ring be the border, instead of it being offset? should it only appear on keyboard navigation, while using a subtler indicator when clicking? (like the one on hover)".

## Approach
One global rule draws a 2 px ring 2 px outside the box (`plugins/react-ui/src/ui/globals.css:57-63`, sizes `packages/ui-core/src/tokens.ts:1026-1027`). A field rings through `has-focus-visible` (`plugins/react-ui/src/ui/components/input/index.tsx:31`), and browsers treat a clicked text field as `:focus-visible`, so a click draws the full offset ring. 003-105, 166, 173 and 174 (done) and 185 (review) settle which popups ring, not where the ring sits or what a click shows. Seen at stack `226f48c`.

## Acceptance criteria
- [ ] A focused field draws its ring on its edge, not offset outside it.
- [ ] Keyboard focus keeps a ring that passes contrast; a pointer focus draws the quieter hover-style edge.
- [ ] Every part keeps a visible keyboard focus (axe and the critique).

## Open questions
- [ ] Its shape, and whether buttons ring on the edge too: the stack session decides; the look goes to the owner.
