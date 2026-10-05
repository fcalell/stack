---
id: 003-71
status: backlog
sessions: {}
---
# react-ui: a picker's field trigger fits a narrow toolbar

## Goal
Stead's Work toolbar holds a Lead and a Repo Picker (design/07-interface.md "Code: the board"; github.com/fcalell/stead). With a long repo name picked, the Repo trigger is 409 px wide in a 375 px screen and the page overflows sideways.

## Approach
In picker/base.tsx `FIELD_TRIGGER` is `flex shrink-0 …` with no max width, inside Toolbar's `flex flex-wrap items-center` row, so the label never truncates. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
