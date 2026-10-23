# An act carries its wiring

An `Act` says what happens around its `onAct` as data: `confirm` (`{ title, sentence }`, asked
before it runs), `done` (the sentence toasted once it resolves), `to` (the route gone to once it
resolves) and `sheet` (the sheet it opens, whose open state the platform holds and whose props it reads from the act on every render, so a sheet follows what its act holds now; an act that opens a sheet has no
`onAct`, the two being exclusive in the type; `sheetOf` types the sheet's form by its procedure). A `LinkAct` takes `blocked` and draws inert with its reason. The platform
sequences them: confirm, run, toast, navigate. A consumer writes none of that by hand, and a
sheet with no act that opens it is addressed by a search param, never by an open flag in a
component's state.

**Why.** Measured on one consumer: every one of 28 confirms wrapped `onAct` in
`confirm({ title, sentence, act })`, 53 of 54 writes toasted the same `done` sentence shape after
`mutateAsync`, 22 navigated after, and 28 of 36 `useState(false)` flags existed only to hold a
sheet an act opens. Each is one shape repeated, so it is the act's data, not the screen's code.

**Trade-off.** The `Act` descriptor is the platform's one orchestration point, so an act that
needs an order the platform does not sequence (a toast before a confirm, two sheets) has no form
and is a gap to file, not a hand-wired exception. `sheet` is a platform widening of the ui-core
descriptor (ui-core imports no React), as `WithReads` widens a row.
