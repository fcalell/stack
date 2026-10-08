---
id: 003-118
status: done
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

## Measured
Not built. The quoted subject as the later meta part ("Rename the flag to --strict across every message of the repo", status "Waiting for you"), the quote span in a row of 320 and 360 px: desktop 135 and 175 px of the 237 it needs (status 81 px); touch 76 and 116 px of the 297 it needs (status 102 px). `measure-short` is 126 px desktop and 162 px touch. The later parts take no width of their own (`w-0`, growing into what the lead and the marks leave), so a status that shrinks, whatever its weight, changes nothing for the quote: the quote gets what the lead and the status leave. A floor on the quote needs a `min-w` on the quoted run, which pads a short quote with empty room inside the later slot, or a restructure of the slot. 003-104 lets an uncapped status share the overflow with the first part.
Question: take `measure-short` as the quote's floor (the quoted run's `min-w`, the status mark at a shrink weight above the plain parts)? Recommended: no; it moves the touch row at 320 px from 76 to 162 px of 297 and nothing on the desktop, for a padded box.

## Ruled
Closed, no change. The subject that names a row is its first part; a `Quoted` later part is the part that yields first (003-142), and the status stays whole and shares overflow with the first part (003-104). A floor on a later quote would pad its slot (touch only, 76 to 162 px of 297) or need a new tier in a shrink ladder already at Tailwind's 10^20 ceiling. An app whose subject must read gives it as the first part of `meta`, or puts the status's words elsewhere.

## Cut
Both acceptance criteria asked that on a narrow meta line a row keep its first part readable (a floor or a share) with the status yielding below it, and that the showcase hold a status with a quoted subject at the phone's width. Neither is delivered. The story was closed "no change" by an AI ruling recorded in its own Ruled section, resting on the ruling that left `yields` without a flag (`rulings.md` line 75, item 142, "Medium-low, and a 320 px row still cutting the spend is a finding to revisit"); the owner did not rule it. The gap is in the code today: a long status still takes its width whole and a quoted subject still cuts to under half (76 of 297 px at 320 on touch, per the story's Measured section).

## Owner ruling
The owner accepts the cut. An app whose subject must read gives it as the first part of `meta`, as the ListRow rule says.
