---
id: 003-66
status: done
sessions: {}
---
# react-ui: an add field or a slider inside a Group's card

## Goal
Stead's Rules and Repos put an add field in the read hosts' card over its list, and Usage puts a window's reserve Slider in the card under its Meter (design/07-interface.md "Rules", "Repos", "Usage"; github.com/fcalell/stead).

## Approach
`Group` holds static rows or a List. A FormField or a Slider inside it stands flush with the card's edge, with no row inset, since only rows and Meter read the group context; the app now stands them in the Section beside the Group.

## Shape
A `FormField` and a `Slider` read `GroundContext` as `Meter` already does and stand in a Group as one of the card's items at the card's inset, with the Group's hairline between them: derivation, no prop.
ui-core renames `METER_ITEM` to `GROUP_ITEM = "p-card"`, drawn by `Meter`, `FormField` and `Slider` and held by none (like `FIELD_ERROR_LINE`; the held-cell holder count drops by one). `FormField` and `Slider` add `card` to the spacing they own. The field keeps its label; no variant is added. A List after the field in the Group needs nothing.
Rejected: a List `add` slot (covers neither Usage's Slider nor a field over a DefinitionRow) and a Group `inset` prop. Only `FormField` and `Slider` read it, since a control in a card is always named. A waiting Group keeps the field live over the List's waiting rows.
Both platforms, after 65. A critique judges the item's vertical inset (`p-card`) against the rows' rhythm beside it.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Partial: the Slider half ships (its item's start inset is 16, the rows' 16); no story draws a FormField inside a Group, so the field half is unrendered.

## Rework
The field half is drawn: `Behaviour/List` `FieldInAGroup` stands a `FormField` over a List of rows in a Group and asserts the field's item inset equals the rows' and the group's hairline stands between them; the `layout-list` frames also draw the field as the first item of the "Allowed hosts" Group in every state. Evidence: `behaviour/list.stories.tsx` in the browser run.

## Critique (second round)
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/r2-components/report.md`).
