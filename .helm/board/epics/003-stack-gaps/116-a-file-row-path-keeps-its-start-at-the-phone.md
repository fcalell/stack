---
id: 003-116
status: done
sessions: {}
---
# react-ui: a file row's path keeps its start beside a chip at 375 px

## Goal
Stead's review lists sensitive files with a chip saying why each is listed (design/07-interface.md "The review screen"; github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx`, `List` `file` rows). At 375 px in light mode the row draws "b… me.json" for biome.json and "d… flags.md" for docs/flags.md: the tail ("me.json", 63 px) is a `shrink-0` span and the head is cut to one letter; at 768 px the tail is 50 px and the row reads the same. Evidence: stead `design/evidence.md`, "The step 5b app at `b3b29d9`" (2026-10-06, stack at `5564217`, `review-files-375-light.png`).

## Approach
Story 003-70 (status review) filed this as "ome.jso" and "d./flags.md" and its fix, `f05bd2ac` (the name's tail stops claiming its start, the path never yields below its name's floor), is in `5564217`; the cut is now a different one and still not the rule's. The rule says the path yields to a floor of the first `TAIL_LEAD` characters, an ellipsis and the tail, and that the chip's label truncates below it; the row draws one letter of the head, so the chip keeps its width beyond the floor or the floor is below the head's lead. The app passes `path` and `chip` as FileRow's props ask. Seen at stack `5564217`.

## Acceptance criteria
- [x] At 375 px a file row with a chip draws at least the first `TAIL_LEAD` characters of its path's name, an ellipsis and its tail, with the chip's label truncating before the path goes below that.
- [x] The row's showcase frame holds a long path with a chip at the phone's width, so a later change to the floor fails it.

## Ruled
Not reproduced at this head. `FileRow` already holds the floor of the rule: measured at the touch density from 250 to 375 px, `biome.json` and `docs/flags.md` beside a chip draw their whole name (the directory goes first) and only the chip's label truncates; the name's `NAME_LEAD` constant is the rule's `TAIL_LEAD`. The "b… me.json" cut of the evidence is a row whose path box fell under its `ch` floor, which no width here produces; if Stead still draws it, the evidence needs the app's font and ground.

## Built
No change to `FileRow`. The frame's chipped list holds a long name (`payment-terms-and-late-invoices.md`) beside a chip, and `behaviour/row-meta.stories.tsx` `FilePathFloor` and `FilePathFloorTouch` hold the floor at 320 and 360 px, both densities: a short name whole, a long one with at least its first three characters, an ellipsis and its tail, the chip's label truncated, the row without sideways overflow.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, and whether 003-70 reopens or this closes with it.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/rows/report.md`).
