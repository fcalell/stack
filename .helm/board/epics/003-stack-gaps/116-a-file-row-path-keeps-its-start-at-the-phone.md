---
id: 003-116
status: backlog
sessions: {}
---
# react-ui: a file row's path keeps its start beside a chip at 375 px

## Goal
Stead's review lists sensitive files with a chip saying why each is listed (design/07-interface.md "The review screen"; github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx`, `List` `file` rows). At 375 px in light mode the row draws "b… me.json" for biome.json and "d… flags.md" for docs/flags.md: the tail ("me.json", 63 px) is a `shrink-0` span and the head is cut to one letter; at 768 px the tail is 50 px and the row reads the same. Evidence: stead `design/evidence.md`, "The step 5b app at `b3b29d9`" (2026-10-06, stack at `5564217`, `review-files-375-light.png`).

## Approach
Story 003-70 (status review) filed this as "ome.jso" and "d./flags.md" and its fix, `f05bd2ac` (the name's tail stops claiming its start, the path never yields below its name's floor), is in `5564217`; the cut is now a different one and still not the rule's. The rule says the path yields to a floor of the first `TAIL_LEAD` characters, an ellipsis and the tail, and that the chip's label truncates below it; the row draws one letter of the head, so the chip keeps its width beyond the floor or the floor is below the head's lead. The app passes `path` and `chip` as FileRow's props ask. Seen at stack `5564217`.

## Acceptance criteria
- [ ] At 375 px a file row with a chip draws at least the first `TAIL_LEAD` characters of its path's name, an ellipsis and its tail, with the chip's label truncating before the path goes below that.
- [ ] The row's showcase frame holds a long path with a chip at the phone's width, so a later change to the floor fails it.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, and whether 003-70 reopens or this closes with it.
