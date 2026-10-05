---
id: 003-08
status: done
sessions: {}
---
# ui-core: a value outside its editable context reads locked, with its reason

## Goal
Martechthings shows contract fields in Live and in another change set's hold as values, never as disabled inputs. A held value names its holder under it ("Held by <request>, <owner>"). `FormField` draws disabled with the description as the reason. `DefinitionRow` has no locked state or reason line, and `Table` with `onEdit` has no read-only cell or column with a lock glyph.

## Approach
- References: incident.io's attribute table, the dependent type cell keeping its box and ending in a lock glyph beside an editable name ([screen](https://mobbin.com/screens/f7e0c36d-4b5c-4847-bf09-22fda62b17df)); Ditto's Developer ID as a mono value with an "Edit" link ([screen](https://mobbin.com/screens/1d5dc347-18b4-4529-bca6-2774a8371df7)).

## Acceptance criteria
- [ ] A `DefinitionRow` draws a locked value with a reason line that may hold a link.
- [ ] An editable `Table` draws a column or a cell read-only with a lock glyph, the rest still editable.

## Open questions
- [x] Lock glyph per cell or in the column head: the stack session decides.

## Shape
`DefinitionRow.locked?: { reason: string; href?: Route }`: a `Lock` glyph after the value and the reason as the row's meta line, the whole line a `Link` when `href` is given; the row drops its `act`. In a `Table`, a cell its row locks (the existing `locked` slot) draws a `Lock` glyph at its end; `TableColumn.locked?: string` makes a column read-only with its reason read aloud and the glyph in the head only. `Lock` at `icon-meta` in `ink-meta`; word `locked`.
