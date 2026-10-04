---
id: 003-14
status: backlog
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
- [ ] Whether the rule's reason is a row meta line or a tick tooltip: the stack session decides.
