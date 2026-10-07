---
id: 003-88
status: backlog
sessions: {}
---
# react-ui: a record in a Split's main reads at the measure

## Goal
Stead's items open as Now's record in the Split's main, and design/07-interface.md says their body reads at the measure (github.com/fcalell/stead, packages/server/src/app/ui/item-screen.tsx). At 1440 the body runs 792 px wide.

Evidence, item screens critique unit u4 (main 54deb15, shot `r0-1440-light`): the review body at 1440 runs the main's full width, the Check card 792 px and the criteria rows 792 px, against a 45 to 75 ch measure.

## Approach
`SPLIT_MAIN` is `gap-sections p-page` with no width cap; only Prose, ProseDiff, Form (in a page) and Thread cap themselves, so Sections, Groups and ActionBars stand at the main's full width. A host `max-w-measure` is not geometry the rules page allows. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
