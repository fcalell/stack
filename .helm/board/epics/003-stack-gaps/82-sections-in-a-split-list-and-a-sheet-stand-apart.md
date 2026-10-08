---
id: 003-82
status: done
sessions: {}
---
# react-ui: sections in a Split's list and in a Sheet's body stand a sections gap apart

## Goal
Stead's Now list (the ask field, Needs you, Underway, Information), Work's board groups and the question sheet's review page (answers, then its bar) abutted with no gap (github.com/fcalell/stead, packages/server/src/app). The app now stands them in a host flex column with `gap-sections`, which the rules page allows as geometry, but the container owns spacing.

## Approach
`SPLIT_LIST` has no `gap-sections` where `SPLIT_PANE` has it, and `SHEET_BODY` (`p-card`) has no gap between its children. Seen at stack f6563f6.

## Shape
Rule C2: a region that holds a page's sections stands them a sections gap apart. `SHEET_BODY` becomes `gap-sections p-card` and `SPLIT_LIST` gains `gap-sections`; the web Split's `PANE_SHEET` wrapper goes (and stead's review-page `div` app-side). The centred confirm (`SHEET_CENTERED`) is untouched.
The phone reads the same rhythm through a shared cell `SPLIT_LIST_STACK = "gap-sections"` (one roster `draws` entry per side), so its `LIST` cannot drift from the web's; the pane's native sheet gets the gap from `SHEET_BODY`.
The list keeps its `py-inside` top inset; a critique glances at a Section head 8 under the strip's hairline. The floating act's room then stands a sections gap under the last section, as the Place body's does. Both platforms; a showcase Split list holding three Sections.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Ship, by a fresh critic at 1280, 768, 1440 and 390, light and dark (scratchpad `critique/split/report.md`).
