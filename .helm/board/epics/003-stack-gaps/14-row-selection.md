---
id: 003-14
status: done
sessions: {}
---
# ui-core: a table chooses rows, and a rule can move the ticks

## Goal
Martechthings publishes part of a change set by ticking its entries, one table per kind. A section head carries a mixed tick. A parent and child rule moves ticks: ticking a change under a new parent ticks the parent, and the moved row says "needed by <name>" until changed. `Table`'s checkbox is an editable value cell, with no row-selection mode, no mixed tick and no moved-tick reason.

## Approach
- References: Jira's unsaved changes table, a tick per row and a header tick, acts on the ticked set ([screen](https://mobbin.com/screens/29e2f1b6-8fb3-434a-9714-1a21e2440393)); Arcade's review, "12 of 12 selected" ([screen](https://mobbin.com/screens/b850abdb-2418-47b3-adaf-eac362756c6d)); Airtable's publish dialog with Select all and Clear all ([flow](https://mobbin.com/flows/a266a50c-845f-4130-9086-3350a2df2250)).

## Acceptance criteria
- [ ] A `Table` takes a selection: a tick per row, a mixed head tick, a row that cannot be ticked with its reason.
- [ ] The consumer sets the selection from a rule, and a row shows why its tick moved.

## Open questions
- [x] Whether the rule's reason is a row meta line or a tick tooltip: the stack session decides.

## Shape
`Table.choose?: TableChoice<T>`, `TableChoice<T> = { chosen: readonly string[]; onChange: (ids: string[]) => void; blocked?: (item: T) => string | undefined; moved?: (item: T) => string | undefined }`. A tick column leads the grid; the head tick is unchecked, mixed or checked over the rows that can be ticked, named by the word `chooseAll`; each row tick is named by its leading cell. The consumer applies its rule in `onChange` and returns the ruled set through `chosen`. A blocked or moved reason is a meta line under the leading cell in `ink-meta`, starting where the name starts. Every tick outside a table cell is a tab stop (the head tick and a list row's tick); the grid's cursor reaches the row ticks. The touch form's meta line leads with one part, the change value with the move's reason after it, then the other values (`touchMeta`); a blocked tick's reason follows the first part the same way, so the change value stays whole ahead of its reason. It puts the tick in `ListRow`'s leading: `RowLeading` gains `{ check: { checked; onChange; blocked? } }`. The count belongs to 003-23's bar, never the table head.

Review (decided by fcalell after re-critique 2): story 14 keeps its shape, a blocked or moved reason on its own line under the name. The choosing table therefore runs below the data-table density range where rows carry a reason (30-37 px; a reason row stands 49), by decision.
