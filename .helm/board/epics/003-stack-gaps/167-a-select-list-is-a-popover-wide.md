---
id: 003-167
status: review
sessions: {}
---
# react-ui: a Select's list stands at the popover's width, not the trigger's alone

## Goal
The Select list is 91 px wide against the 215-300 range of the popover pattern (-58 %) because it takes the trigger's width. Measured by the sheet critique (`critique/sheet/report.md`, Select), pre-existing.

## Approach
The list is a popover: `SELECT_POPOVER` (`w-popover`, held by Select, as `PICKER_POPOVER` is Picker's) with the trigger's width as its floor (`min-w-(--anchor-width)`), so a wide trigger still gets a list as wide as itself.

## Acceptance criteria
- [x] The open list is at least the popover width (`Behaviour/Select` `ListIsPopoverWide`).

## Built
`SELECT_POPOVER` in `packages/ui-core/src/variants.ts`, drawn and held by `Select` in the roster; `select/index.tsx` composes it with `min-w-(--anchor-width)`. DESIGN.md regenerated.
