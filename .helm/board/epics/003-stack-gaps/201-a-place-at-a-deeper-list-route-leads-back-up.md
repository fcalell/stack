---
id: 003-201
status: review
sessions: {}
---
# react-ui: a Place whose list stands at a deeper route leads back up

## Goal
Stead's Work place shows an epic's own board at `/work/code/epics/<epic>`: the same `Place` with its toolbar (the Lead and Repo pickers) and its "New story" act, titled by the epic's quoted name, its `Split`'s list the board filtered to the epic (github.com/fcalell/stead, `packages/server/src/app/routes/work/route.tsx`, the epic branch; design/07-interface.md "### Work", the Frame row). With no card open, nothing leads back up to the epics list at `/work/code`: the only way is re-picking "All repos" in a Repo picker that already reads "All repos", which looks like a no-op. Evidence: Stead's Work critique unit u6 at stack `74a0e3d`, shots `w-epic-1280-light` and `w-epicboard-390-dark` (Stead scratchpad `critique/u6/shots/`).

## Approach
A `Place` draws a back act only while a record is open (its strip or top bar leads with it, to the Split's `back` or the place's route). A `Split`'s `back` names where the list stands alone, which an open record returns to; it draws nothing while the list itself is the deeper view. A pushed `Screen` takes `back`, but it has no toolbar and no place actions, so the epic's board would lose its pickers and "New story", which 07 keeps. The app cannot draw its own back act in a Place's strip without rebuilding the roster's top bar.

## Acceptance criteria
- [x] A `Place` whose list stands at a route deeper than the place's own (an epic's board under a lead's board) leads its strip, or its top bar on touch, with a back act to a route the app names, keeping its toolbar and actions, at every width.
- [x] A Place at its own route is unchanged.
- [ ] The Place showcase holds a deeper list with its back act at 390 and 1280, measured by the critique.

## Open questions
- [x] Its shape (a `back` on Place, the Split's `back` read while no record is open, or another): the stack session decides.

## Ruled
`up?: Route` on `Place` (both platforms): the route of the view the page stands under; its back act leads there while no record stands alone. Not a Split field (the Split's `back` is where the list stands alone, which an open record returns to) and not derivable (a place's route can redirect to a lead).

## Built
`Place` (react-ui) draws an `up` act as an `IconButtonLink` in a `LIST_BACK_REPLACED` span first in the strip and, on touch, in the lead slot of the top bar in the switcher's stead (with `PAGE_TOP_BAR_START` when the bar is the title's row); below `tablet` with a record open the record's back act shows instead. native-ui leads the top bar with the record's back, else `up`, else the switcher. A Place with no `up` is unchanged. `up` is in the roster's Place entry, both `rules.md`, and `ui-core.md`. The Split showcase frame stands under `up` so the critique can measure it at 390 (list alone, record open) and 1280.
Evidence: `apps/showcase/behaviour/place.stories.tsx` (`UpLeadsTheStrip` before the title at 1280, `UpLeadsTheTopBar390` 44x44 at the page edge, `UpGivesWayToTheRecordBack390`, `UpWithARecordBesideTheList`, `OwnRouteDrawsNoUp`, `UpTakesTheSwitcherPlace390`) pass. The third acceptance waits on the critique.

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.
