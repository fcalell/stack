---
id: 003-133
status: backlog
sessions: {}
---
# react-ui: a searchable Picker says "No matches" only when the search matches nothing

## Goal
Stead's Quiet hours draws two `Picker`s of 25 options (None and the 24 hours) as row-fit triggers (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/sinks.tsx`; design/07-interface.md "Sinks"). On the desktop the popover past six options leads with a search, and with nothing typed it lists the hours and ends with the line "No matches" under them. Evidence: System critique unit u8, shot `qh-menu-1440-light` (Stead scratchpad `critique/u8/shots/`, stack at `5564217`); the list scrolls inside the popover and the popover stays inside the viewport, so the line is the whole defect.

## Approach
`PickSearch` (plugins/react-ui/src/ui/components/picker/base.tsx) draws `<Combobox.Empty render={<NoMatches ground="list">{words.noMatches}</NoMatches>} />`. Base UI's `Combobox.Empty` shows its children only when no item matches, by setting its own `children` to `null` otherwise (combobox/empty/ComboboxEmpty.js, 1.8.0), but `evaluateRenderProp` merges the render element's own props over those (internals/useRenderElement.js, `mergeProps(props, render.props)`), so the sentence carried by the `NoMatches` element always wins and is drawn whether anything matches or not. The app passes only options and cannot reach the popover. Not 003-75 or 003-113 (open-menu axe findings). Seen at stack `5564217`.

## Acceptance criteria
- [ ] The line draws only while the typed search matches no option, on the desktop popover; the live region stays mounted for announcing.
- [ ] A popover with matches shows no empty line and the list is unchanged.
- [ ] The Picker showcase holds a searchable list with and without a typed miss and the critique reads the popover's last row.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the sentence moves to the `Empty`'s children or `NoMatches` reads the filter state.
