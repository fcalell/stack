---
id: 003-183
status: backlog
sessions: {}
---
# react-ui: a PendingBar keeps the height of the action bar it replaces

## Goal
Stead's item screens swap their `ActionBar` for a `PendingBar` in the same place while the server works on a decision (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx:665`; design/07-interface.md "Decisions keep their screen" and the item screens' Pending row: `PendingBar` in the bar's place, as Cursor's "Merging…" keeps the merge act's place). On the phone the acts stack, so the page shrinks under the operator's finger the moment they tap: a bar of three acts goes from 148 px to the PendingBar's 44 (−104), of two acts 96 to 44 (−52); on the desktop a four-act bar in two rows moves the Provenance section up 52 px. Evidence: Stead's item screens critique unit u3 at stack `74a0e3d` (Stead scratchpad `critique/u3/report.md`, shots `u3/shots-4/`).

## Approach
`PendingBar` draws its own one-row height whatever stood in its place, and `ActionBar` and `PendingBar` share nothing that carries the bar's extent. `Act.loading` keeps a single act's place (a spinner on its label), but 07's pattern is the bar becoming the server's phase in words, with a track toward a deadline, which one act's spinner cannot say. The app cannot size the PendingBar: no prop takes a height or act count, and a wrapper with a min-height is a local copy of the bar's geometry.

## Acceptance criteria
- [ ] A `PendingBar` that takes an `ActionBar`'s place stands at that bar's height at every density (stacked acts on touch, wrapped rows on the desktop), so nothing below it moves when the swap happens or when the bar comes back.
- [ ] A `PendingBar` standing alone is unchanged.
- [ ] The showcase holds the swap for a one-, two- and three-act bar at 390 and 1280, measured by the critique.

## Open questions
- [ ] Its shape (the PendingBar taking the act count, as `ActionBar loading={acts}` does, or one part that holds both forms): the stack session decides.
