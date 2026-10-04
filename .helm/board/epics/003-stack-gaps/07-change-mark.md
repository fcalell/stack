---
id: 003-07
status: backlog
sessions: {}
---
# ui-core: a row carries its change mark

## Goal
In a change set's context, Martechthings marks every field, row and binding the change set touches where it stands: added, changed, removed or stale, as a leading glyph and a tinted rule. The same mark goes on journey steps, which are rows, not code lines. `ListRow`, `DefinitionRow`, `FormField` and `Table` rows have no such mark, and `Diff` draws code lines, not a mark on a live record.

## Approach
- References: PlanetScale's branch page, each object card with an amber pencil for changed and red for removed ([screen](https://mobbin.com/screens/bf55baee-279d-4309-8671-697fe3605395)); Railway's changes dialog, glyph and tint per row ([screen](https://mobbin.com/screens/131e5390-18b7-4eb6-9715-bb5d9497c7fb)).
- Hues follow chips-and-statuses and diff-and-code: green added, red removed, grey unchanged; stale is warn.

## Acceptance criteria
- [ ] `ListRow`, `DefinitionRow`, `FormField` and a `Table` row each draw one of added, changed, removed, unchanged, stale, by one shared mark, in light and dark.
- [ ] The mark reaches assistive tech as words.

## Open questions
- [ ] One `change` prop across the four, or a wrapper: the stack session decides.
