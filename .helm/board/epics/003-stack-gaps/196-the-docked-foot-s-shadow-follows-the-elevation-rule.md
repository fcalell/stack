---
id: 003-196
status: backlog
sessions: {}
---
# ui-core: a docked foot carries no shadow, or the elevation rule names it

## Goal
A filling Thread's foot (the message input, or a docked question sheet) draws `0 1px 2px, 0 4px 12px` (the `shadow-float` pair) on its 680 x 93 cell at 1280 px, in both modes, though a foot is a region of the page, not a lifted layer (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx`; design/07-interface.md "Conversation"; shots `shots/thread-1280-light`, `shots/thread-1280-dark`). Evidence: Stead's chats critique unit u5 at stack `74a0e3d`, Stead scratchpad `critique/u5/report.md` ("Thread foot shadow ... shadow only on lifted layers"); the roster is unchanged at HEAD.

## Approach
`DESIGN.md` "Elevation & Depth" says a card at rest has a hairline and no shadow, and lists what `shadow-float` lifts: "a popover, a menu, a picker's list, a toast and an act floating over what scrolls (a touch Place's act, a Thread's Latest)"; ui-core's `README.md` ("Elevation is two levels spent on lifted layers only ... Groups, rows and cards are flat") says the same. `FOOT_DOCKED` (`packages/ui-core/src/variants.ts:851`) is `border-t border-edge-raised bg-raised shadow-float px-page py-acts ...`, and its comment calls the foot "a raised surface (a step in dark, the float shadow in light)", so the foot draws a shadow the rule's list does not name. It is also cast downward (a 4 px offset, 12 px blur) from a cell that stands at the region's bottom edge, so it falls on the shell's tab bar or off the screen and lifts nothing from the log above it, while the hairline already separates the two. The app cannot remove it: a shadow outside a component's elevation row is a contract error and the foot is the roster's own cell.

## Acceptance criteria
- [ ] `FOOT_DOCKED` and `DESIGN.md` agree: either the foot draws no `shadow-float` and rests on its `raised` step and hairline, or the Elevation section names a docked foot among the layers `shadow-float` lifts, with the reason and an upward cast.
- [ ] The Thread, Place and Sheet frames' Built stories show the foot per that rule in both modes, on both platforms.

## Open questions
- [ ] Which way it falls (drop the shadow, as a card at rest has none, or name the foot in the rule): the stack session decides.
