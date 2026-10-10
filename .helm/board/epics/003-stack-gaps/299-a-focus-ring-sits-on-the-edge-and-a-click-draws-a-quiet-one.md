---
id: 003-299
status: done
sessions: {}
---
# react-ui: the focus ring sits on the edge, and a click draws a quiet one

## Goal
Stead's owner finds the focus ring intrusive. Found by the owner's hands-on test of Stead (github.com/fcalell/stead, `test-notes.md`, 2026-10-10): "should the current blue focus ring be the border, instead of it being offset? should it only appear on keyboard navigation, while using a subtler indicator when clicking? (like the one on hover)".

## Approach
One global rule draws a 2 px ring 2 px outside the box (`plugins/react-ui/src/ui/globals.css:57-63`, sizes `packages/ui-core/src/tokens.ts:1026-1027`). A field rings through `has-focus-visible` (`plugins/react-ui/src/ui/components/input/index.tsx:31`), and browsers treat a clicked text field as `:focus-visible`, so a click draws the full offset ring. 003-105, 166, 173 and 174 (done) and 185 (review) settle which popups ring, not where the ring sits or what a click shows. Seen at stack `226f48c`.

## Acceptance criteria
- [x] A focused field draws its ring on its edge, not offset outside it.
- [x] Keyboard focus keeps a ring that passes contrast (colour unchanged, `ring` = `accent-ink`); a pointer focus draws the quieter hover-style edge. The computed styles await the batch browser run (`Behaviour/Input` `ClickIsQuietKeyboardRingsTheEdge`).
- [x] Every part keeps a visible keyboard focus (axe and the critique): awaits the batch browser run and the critique. Buttons, links, checkbox, switch, slider thumb and chips are untouched and keep the 2 px ring at 2 px.

## Open questions
- [x] Its shape, and whether buttons ring on the edge too: the stack session decides; the look goes to the owner.

## Ruled
The owner's ruling (rulings.md, 003-299) holds: the ring centres on the hairline for a bordered box that takes typing or choosing; only keyboard focus draws it; a click draws the hover edge. Buttons, links, checkbox, switch, slider thumb and chips keep the 2 px ring at 2 px offset (an edge ring on a filled accent button would vanish); inset rings and native are unchanged. 003-105's "2 px outside a kept edge" holds for those controls only; the field's line is reversed here (its Ruled note is superseded for fields).

Shape: one numeric token in ui-core (`RING_EDGE_OFFSET_PX = -1`, `--focus-ring-edge-offset`, scaled in the room); in react-ui one `BOX_FOCUS` string in `lib/modality.ts` replaces the three copies (Input, TextArea, MessageInput; FileInput imports it). The OTP boxes keep their own `peer-` form of the same ring, since the ring rides on the hidden input's focus. The Select and Picker triggers are buttons: their own keyboard ring takes `focus-visible:outline-offset-(--focus-ring-edge-offset)` and their open state the same offset (`TRIGGER_OPEN`, `FIELD_OPEN`); a click on a button is never `:focus-visible`, so they need no modality. The OTP draws no hover edge (it has none), so a click on it draws no ring and no edge. An error field keeps its error edge on a click (the pointer edge rides on `BOX_HOVER`, which a field takes only while valid). FileInput's drag-over ring takes the edge offset too, being the same box's ring.

## Built
- `packages/ui-core/src/tokens.ts`, `emit.ts`: `RING_EDGE_OFFSET_PX`, emitted as `--focus-ring-edge-offset` on the root and in the room scale (`roomRingTokens`); `scripts/verify.ts` checks it at u = 1 and 2 (negative, `-unit`). DESIGN.md regenerated (unchanged: it lists no ring offset).
- `plugins/react-ui/src/ui/lib/modality.ts` (new): `useModality()` ref-counts one capture `pointerdown`/`keydown` listener pair, setting `data-modality` on `<html>`; `BOX_FOCUS` (`not-in-data-[modality=pointer]:has-focus-visible:` ring at the edge offset, still yielding to an act inside the box) and `POINTER_FOCUS_EDGE` (`in-data-[modality=pointer]:has-focus-visible:border-edge-hover`). Input, TextArea, InputOtp, MessageInput and FileInput call the hook; `BOX_HOVER` and `BOX_HOVER_VALUE` carry the pointer edge.
- `input-otp`, `select`, `picker/base`, `file-input`: edge offset as ruled. `scripts/overlays.ts` follows the swept classes; `scripts/verify.ts` `emitted` now escapes `=` (a class with `[a=b]` never matched its escaped selector).
- Docs: `globals.css` comment, `plugins/react-ui/README.md`, `packages/ui-core/README.md`, `judging.md` (the focus-ring dialect line), `.helm/knowledge/architecture/ui-core.md`.
- Story written, not run: `Behaviour/Input` `ClickIsQuietKeyboardRingsTheEdge` (click: modality pointer, outline none; Tab away and back: modality keyboard, solid 2 px outline at -1 px). Native unrendered and unchanged.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique pass: every part keeps a visible keyboard ring (at least 5.16:1); fields ring 2 px at -1 px offset (5.68 light, 7.89 dark); a click draws no ring and the hover edge (3.52:1); an error field keeps its error edge on click.
