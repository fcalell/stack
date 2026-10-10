---
id: 005-02
status: review
sessions: {}
---
# react-ui, native-ui: a Place knows its Split's record and Details before first paint

## Goal
`Split` pushes facts into its Place from passive effects: web `lend`, `recordOpen` and
`besideOpen` (`components/split/index.tsx:86-100`, into `place/index.tsx:162-165`); phone `lend`,
`besideOpen` and `standAlone` (`split/index.tsx:63-81`). A deep link to a record paints the
list's Toolbar and a head with no back or Details act, then the head jumps; every open and close
repeats it. On the phone, the list and record `<Scroll>`s (`split/index.tsx:88-120`) share one
unkeyed slot, so the list's offset carries into the record; and `open` (`:53`) latches, so
Details pops open by itself on the next record.

## Approach
Decided by fcalell (2026-10-04): a frame learns what its children need up front, through props
or slots, never from a layout effect or a post-paint state push; a registration that must stay
(the parent cannot know a child's kind statically) is read in render from a host object.

- **Web**: Place owns the Details handle (`Dialog.createHandle`) and hands it down; Split marks
  itself `data-record` and `data-pane`; Place always renders the back and Details acts and shows
  them, and hides the Toolbar, with `group-has-[…]/page` variants. `LendAct`, `RecordOpen`,
  `RecordShown` and the effects go.
- **Phone**: Place reads the record and pane in render from a host object. Each region's
  `<Scroll>` has its own key; the Details state resets with the record it belongs to.

## Acceptance criteria
- [x] (live) web, a deep link to a places record at 375: the first frame has the back and Details acts and no list Toolbar.
- [ ] (live) phone, on the harness: a deep-linked record paints its final head first; a record opens at its top after a scrolled list; Details stays closed on the next record.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live, every frame from document start: a deep-linked record at 375 has its back and Details acts and no Toolbar in its first frame, and each width keeps its acts in every frame. Phone (the recommended option, b): a Split stands as its page's direct child and the page reads its props in render; a deeper Split draws as a plain region. Open: the phone live criterion on the harness.

## Critique
Unrendered: first paint is a live trace criterion; the settled head holds.

## Review
Web accepted 2026-10-10 on the owner's ruling and the suite; waits on the native render (the phone box stays open). Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass.
