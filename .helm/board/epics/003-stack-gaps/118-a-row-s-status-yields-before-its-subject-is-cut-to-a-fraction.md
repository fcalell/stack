---
id: 003-118
status: backlog
sessions: {}
---
# react-ui: a row's status yields before the subject is cut to under half

## Goal
Stead's Now rows read "Code · “Rename the flag to --strict” · …" with the status "Waiting for you" on the meta line (design/07-interface.md "Now"; github.com/fcalell/stead, `packages/server/src/app/routes/_now/-components/now-list.tsx`). At 375 px the status stands 101 px whole while the quoted subject's span is 144 px of the 320 px its text needs in a 303 px meta line, so the row reads "Code · “Rename the flag…" ("“Load covers fro…", "“Sort the shelf by…"); at 768 px the span is 324 of 324 px, at 1440 px 155 of 256 px beside a 335 px list column. Evidence: stead `design/evidence.md`, "The step 5b app at `b3b29d9`" (2026-10-06, stack at `5564217`, `hm-now-375-light.png`).

Evidence, System critique unit u8 (Stead `948b7ec`): Usage's status "Watches paused for u…" is cut in the 311 px list column; Landings' status "No gate stands after t…" is cut at 130 px (scrollWidth 176) inside a 758 px row at 1440, so the status truncates with most of the row free.

## Approach
ListRow's meta line holds that "the status and the glyphs keep their width" and that the first part truncates last of the yielding parts (list-row/index.tsx), so a status of any length takes its width before the subject, the part that names the item, loses nearly half of its text. Not 003-104: that is a status label capped by `max-w-measure-short` with room to spare, this one has no room and the order of yield is what is in question. Not 003-83 (the trailing age taking the title's width). Seen at stack `5564217`.

## Acceptance criteria
- [ ] On a meta line too narrow for its status and its first part, a row keeps the first part readable (a floor in characters, or a share of the line) and the status label truncates or yields below it.
- [ ] The ListRow showcase holds a status with a quoted subject at the phone's width.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the status takes a shrink weight, a floor on the first part, or a shorter word on a narrow line.
