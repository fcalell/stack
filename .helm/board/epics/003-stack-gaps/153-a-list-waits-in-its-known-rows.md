---
id: 003-153
status: review
sessions: {}
---
# react-ui: a List given its items waits in those rows, only their trailing values waiting

## Goal
Stead's System index lists fixed rows (Leads, Rules, Sinks, Memory) whose trailing counts arrive with the data (design/07-interface.md "Loading: the rows are fixed", lines 818 to 902; github.com/fcalell/stead, `system-index.tsx:135-139`, which passes `items` and `loading`). System critique unit u8 (Stead `948b7ec`, shot `s6-loading-status`): the loading index draws 4+4+4 skeleton rows (129 to 647 px) where the loaded index is 2+3+2 rows (129 to 439 px), so the page shrinks 208 px and the labels the viewer already knows blink out and back.

## Approach
A `List` with `loading` draws waiting rows "in the slots its map declares" (list/index.tsx doc) and ignores `items`. `ListRow` has no waiting form for a trailing value of its own (`trailing` is a word, count, age or pick; list-row/index.tsx). A row whose title is known and whose count is pending cannot be drawn; the app would have to build the loaded rows itself and invent a placeholder for the value, a local copy of what the List does.

## Acceptance criteria
- [x] A List given `items` and `loading` draws those rows with their titles, each trailing value in a waiting form at the loaded value's size. (`Behaviour/Waiting` `ListOfKnownRows`, `ListOfKnownRowsTouch`)
- [x] A List without items waits as it did. (the List state stories, and `loading` with no items takes the path it took)
- [ ] The List showcase holds a list of known rows with pending counts beside the loaded one, measured at 390 and 1440.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided while building (2026-10-07)
Built under the waiting contract of 003-131, 003-132 and 003-123: the part derives its form from what it is given, with no new prop. A `List` with `row`, a `trailing` slot in the map, no tree (`children`), its own `loading` set and `items` that hold a row draws those rows as loaded, and each row's trailing value as a four-figure bar. The List passes such a row `trailing={undefined}` (the app's `trailing` slot is not called for it) and sets a `TrailingWait` context (`lib/trailing-wait`), which is the only signal: `ListRow` reads it and draws the bar in the value's place, with the title, leading, meta and acts as the map gives them for the item. A trailing pick waits as the same bar. A List without items, with a query, with a tree, in a loading Section (the context, not its own `loading`) or without a `trailing` slot waits as it did. Decided: the trigger is the List's own `loading` with items, not the loading a Section hands down, since a loading Section's items are not known to be real. The `ui-core.md` List entry, the roster note, the `loading` doc on both platforms and both `rules.md` pages say it. The List frame's `Loading` state holds a list of known rows with pending counts beside the loaded one; the critique measures them at 390 and 1440. Proven at 1280 and in a 375 px phone: the waiting list's height equals the loaded list's, its titles stand and its counts do not.

Ruled (2026-10-07): no placeholder value goes through `ListRow`'s typed `trailing` prop. The context alone makes the row wait (`waits || (trailing && !("pick" in trailing))` gates the value; the pick path is guarded by `!waits`), and the List does not read the app's slot for a known waiting row. The trigger stays the List's own `loading` with items. Re-proven by `ListOfKnownRows` and its Touch story and the List state stories.
