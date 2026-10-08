---
id: 003-183
status: review
sessions: {}
---
# react-ui: a PendingBar keeps the height of the action bar it replaces

## Goal
Stead's item screens swap their `ActionBar` for a `PendingBar` in the same place while the server works on a decision (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx:665`; design/07-interface.md "Decisions keep their screen" and the item screens' Pending row: `PendingBar` in the bar's place, as Cursor's "Merging…" keeps the merge act's place). On the phone the acts stack, so the page shrinks under the operator's finger the moment they tap: a bar of three acts goes from 148 px to the PendingBar's 44 (−104), of two acts 96 to 44 (−52); on the desktop a four-act bar in two rows moves the Provenance section up 52 px. Evidence: Stead's item screens critique unit u3 at stack `74a0e3d` (Stead scratchpad `critique/u3/report.md`, shots `u3/shots-4/`).

## Approach
`PendingBar` draws its own one-row height whatever stood in its place, and `ActionBar` and `PendingBar` share nothing that carries the bar's extent. `Act.loading` keeps a single act's place (a spinner on its label), but 07's pattern is the bar becoming the server's phase in words, with a track toward a deadline, which one act's spinner cannot say. The app cannot size the PendingBar: no prop takes a height or act count, and a wrapper with a min-height is a local copy of the bar's geometry.

## Acceptance criteria
- [ ] An `ActionBar` given `pending` stands the pending form at the bar's own loaded height at every density (stacked acts on touch, wrapped rows on the desktop, a blocked act's reason line included), so nothing below it moves when `pending` is set or cleared; the ghost acts take no focus, press or announcement, and Enter in a form field does not submit through them. (Web verified by the stories; native by construction, the reason line and pending-with-own-act limit measured as below.)
- [x] A `PendingBar` standing alone is unchanged.
- [ ] The showcase holds the swap (`pending` set and clear) for a one-, two- and three-act bar at 390 and 1280, plus a four-act desktop bar that wraps, measured by the critique (the frame holds them; the critique is a separate session).

## Open questions
- [x] Its shape: ruled, `ActionBar` takes `pending`.

## Ruled
Neither shape: a count on `PendingBar` cannot reproduce a desktop bar whose acts wrap by their label widths, so the loaded bar is the measure. `ActionBar` takes `pending?: PendingBarProps` and draws its own acts as a ghost under the `PendingBar`.

## Built
- react-ui `components/action-bar/index.tsx`: with `pending` set, one grid cell holds the bar (`invisible`, `inert`, `aria-hidden`, every act `ActInert`, none the form's submit) and the `PendingBar` over it, so the cell is the loaded bar's height at every density and wrap and Enter in a field presses no ghost act.
- native-ui `components/action-bar/index.tsx`: the ghost (`opacity-0`, `pointerEvents="none"`, hidden from accessibility) and the `PendingBar` stand in one `flex-row`, each `w-full`, the `PendingBar` pulled back over the ghost by `marginLeft: "-100%"` (a percentage margin resolves against the row's width; Tailwind has no negative percentage margin class, so it is a style). Yoga sizes the row to the taller of the two, so a pending form taller than the bar (its own `act` over a one-act bar) pushes what is below down and nothing is measured. The render is unchecked on a phone.
- `PendingBar` alone is unchanged; its doc comments and both `rules.md` point to `pending`. The ui-core roster lists the `pending` prop; `ui-core.md` describes the swap.
- Showcase: the ActionBar frame holds the swap for one, two and three acts and the wrapped four-act bar (`Swaps`). `behaviour/action-bar.stories.tsx` asserts the pending box equals the loaded box in height (within half a pixel) and that the line below keeps its offset, on the desktop and touch density, and that the ghost acts are absent from the accessible tree and Enter in a field submits nothing. Scoped stories run: 105 files, 404 tests passed, peak 4890 MiB.
- Out of scope: `Act.loading` is unchanged; the same latent gap for a Section holding fields directly plus an `ActionBar` (003-179) stays.
Native unrendered: ActionBar pending keeps the bar height, native side.
