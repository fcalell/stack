---
id: 003-23
status: review
sessions: {}
---
# ui-core: a selection bar at a list's foot

## Goal
Martechthings' partial publish keeps a bar in view at the foot of the scrolling diff: "N of M chosen" and the count left behind, beside the one act whose label follows the count ("Publish 4 changes"), blocked with its reason when nothing can publish. `ActionBar` closes a form or a sheet; it is not a bar over a scrolling list.

## Approach
- References: Arcade's "12 of 12 selected" beside Confirm ([screen](https://mobbin.com/screens/b850abdb-2418-47b3-adaf-eac362756c6d)); Jira's acts on the ticked set at the table's foot ([screen](https://mobbin.com/screens/29e2f1b6-8fb3-434a-9714-1a21e2440393)).

## Acceptance criteria
- [ ] A bar stays at the foot of a scrolling list with a live count and one act whose label the consumer sets, and a blocked reason.

## Shape
`ActionBar.chosen?: { count: number; of: number }` draws the slot word `chosenOf` ("{count} of {of} chosen") at meta at the bar's start; the act label and its blocked reason stay the consumer's `Act`. The bar docks through `Place.foot` (its doc widens to a docked field or action bar); a foot holding a bar spans the body width on desktop, a field keeps the measure column. On touch the count stands over the full-width act. Range: `patterns/selection-bar.md`.
