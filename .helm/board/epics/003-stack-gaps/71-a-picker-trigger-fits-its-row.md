---
id: 003-71
status: review
sessions: {}
---
# react-ui: a picker's field trigger fits a narrow toolbar

## Goal
Stead's Work toolbar holds a Lead and a Repo Picker (design/07-interface.md "Code: the board"; github.com/fcalell/stead). With a long repo name picked, the Repo trigger is 409 px wide in a 375 px screen and the page overflows sideways.

## Approach
In picker/base.tsx `FIELD_TRIGGER` is `flex shrink-0 …` with no max width, inside Toolbar's `flex flex-wrap items-center` row, so the label never truncates. Seen at stack f6563f6.

## Shape
A primitive fix, no contract change, web and phone. Web `FIELD_TRIGGER` drops `shrink-0` and gains `min-w-0 max-w-full`, and Toolbar's acts row gains `min-w-0`, so a trigger wider than its whole line shrinks and its value truncates with the chevron kept; acts that fit keep their width. Native drops `shrink-0`, gains `max-w-full`, and the value takes `numberOfLines={1}`.
A field-fit trigger in a Form keeps its look, since shrink only acts on overflow. No pins move (`min-w-0` and `max-w-full` are already listed). No critique needed.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
