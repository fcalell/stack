---
id: 003-144
status: backlog
sessions: {}
---
# react-ui: a Picker in a toolbar's start hangs its list from its start edge

## Goal
Stead's Work toolbar sets its Repo and Lead pickers at the start of the line; on the desktop the Repo popover opens at x 207 to 447 under a trigger at 350 to 447 (143 px left of the trigger, 33 px into the sidebar) and the Lead popover at x 102 to 342 under a trigger at 264 to 342 (162 px left, wholly over the sidebar), covering the sidebar and the row context (github.com/fcalell/stead, `packages/server/src/app/routes/work/route.tsx`; design/07-interface.md "Work"). Evidence: critique unit u6, shots `picker-repo-1440-light`, `picker-repo-1440-dark`, `picker-lead-1440-light` (Stead scratchpad `critique/u6/shots/`, stack at `5564217`).

## Approach
`PickerBase` takes `align?: "start" | "end"` and defaults to `end`, for "a title's context, a header's fact" where the trigger leads its line (picker/base.tsx); the public `Picker` and `PickerProps` pass no `align`, so a consumer cannot ask for the start edge, and a `Toolbar` does not set it for the pickers it holds. The app cannot place a popover from outside (geometry goes on host elements only). Related: 003-06 and 003-30 built the picker; 003-133 is its search. References: Airtable's token popover under its token, Notion's rules popover under the rules chip. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A Picker in a Toolbar's start hangs its list from its start edge and flips only on a collision with the viewport; one at the toolbar's end hangs from its end.
- [ ] The Toolbar showcase holds two pickers at the start and the critique measures the popover's x against its trigger's.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether `Picker` takes `align` or the Toolbar decides by where the picker stands.
