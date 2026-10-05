# The room density

2026-10-05. The designer pass for 003-57: the `room` set as the touch set on a ten-foot canvas, with the decisions fcalell confirmed (each open question resolved as recommended). Feeds 003-57; drains when it lands, its standing facts promoted to `.helm/knowledge/architecture/ui-core.md`.

Evidence: `packages/ui-core/guide/patterns/ten-foot.md`. Read against master `c2e3343` (`tokens.ts` `BODY_SIZE`, `SPACING_RATIO`, `SIZE_PX`; `derive.ts` `sizeOf`, `spacingFor`, `sizesFor`, `perDensity`; `emit.ts` `densityTokens`; react-ui `node/theme.ts` `densityLayer`, `density.ts`).

## The finding that shapes the set

Both platforms' ten-foot guidance designs on one canvas, 960 × 540, scaled to the screen (Microsoft at 200 % for XAML and 150 % for HTML; Android TV at mdpi). On that canvas the body is 15–16, controls at least 32, information a phone's. That is stack's touch set: body 16, control 44, phone structure. So the room set is the touch set drawn on a 960 × 540 canvas and scaled to the screen, not a third hand-tuned ladder.

The canvas also settles why the set must scale rather than hold fixed px: the CSS width a TV browser reports varies (Microsoft names 1280 for HTML apps on Xbox, 960 at 200 %, and a kiosk browser at 1920), so any fixed px set is right on one screen and half or double on the next.

## Inputs

- **Canvas unit** `u = max(1px, min(100vw / 960, 100dvh / 540))` on the web; on the phone `min(width / 960, height / 540)` from `useWindowDimensions`, at least 1. The min of both axes keeps a portrait kiosk or an ultrawide screen inside the canvas; the floor keeps a small window at the touch set, never under it. At 1920 × 1080, `u` is 2.
- **Body** 16 canvas units, the touch body. Every type role keeps its ratio (`TYPE_SCALE`), except display (C1).
- **Spacing**: the touch ratios (`SPACING_RATIO.touch`), except `page`, which is the safe inset: 12 rungs (48 canvas units) (C2).
- **The thirty sizes**: `SIZE_PX.touch` in canvas units; the four derived sizes derive as today (text area and message input from the body line box, `figures` from the code size).
- **Measures**: `ch` on the web, so they follow the type; native's px measures scale by `u`.
- **Widths** (popover, toast, dialog, sheet, sidebar, list, pane, column, auth, empty): scaled by `u`, so a pane holds the same characters it holds on a phone.
- **Hairline and ring**: scaled by `u` (2 px hairline, 4 px ring, 4 px offset at 1920). A 1 px hairline vanishes at three metres; Android TV's focus outline and glow grow with the element.
- **Radii**: scaled by `u`. Today a radius is density-invariant because touch and desktop differ by about 1.3×; room is a uniform 2× zoom, and an unscaled 6 px radius on an 88 px control reads square.
- **Motion**: durations and easings unchanged.
- **Structure**: room draws touch structure. The `touch:` variant and `useTouch` match inside a room Place, so nothing depends on hover (Microsoft: no tooltips; Android TV: focus, press, no hover).
- **Focus**: the existing `ring`, scaled. No scale transform: the roster draws focus as a ring everywhere, and a scaled element blurs its text on most TV compositors.

## Key numbers at 1920 × 1080 (u = 2)

| Token | Canvas | At 1920 | Range |
| --- | --- | --- | --- |
| body | 16 | 32 | 30–32 |
| meta / caption | 15 / 14 | 30 / 28 | supplemental ≥ 24 |
| heading / title | 18 / 22 | 36 / 44 | – |
| display (ratio 2.77) | 44 | 88 | figure 5–9× its label |
| display (C1, ratio 5) | 80 | 160 | 5.3× a meta label |
| control / target | 44 | 88 | ≥ 64 |
| row / row-2 | 48 / 64 | 96 / 128 | – |
| page inset | 48 | 96 | 96 sides, 54 top and bottom |

## Structures that change

- `tokens.ts`: `DENSITIES` gains `room`; `BODY_SIZE.room = 16`; `SPACING_RATIO.room` (the touch record, `page: 12`); `SIZE_PX.room` (the touch record); a new `ROOM_CANVAS = { width: 960, height: 540 }`; the display override if C1 holds (a `TYPE_SIZE_ROOM: Partial<Record<TypeRole, number>>`, or `TypeRoleSpec.size` becoming per density for display only).
- `derive.ts`: `perDensity` covers room with no new code; its values are canvas units, not px. `ResolvedTheme` gains the room-scaled radii, widths, hairline and ring (today constants outside the per-density records).
- `emit.ts`: `densityTokens` emits each room value as `calc(N * var(--room-unit))` instead of `Npx`, plus the radius, width, hairline and ring variables, and `--room-unit` itself.
- react-ui `node/theme.ts`: the room tokens under `[data-distance="room"]` in the density layer; the `touch:` variant's condition gains that scope. `density.ts`'s `useTouch` reads the Place's distance from context as well as the query.
- native-ui: a room scope through uniwind `ScopedVariables` with numbers computed from `u` (the `RaisedGround` mechanism), the Place providing it.
- Verify sweeps: every size and contrast sweep runs the room set at u = 1 and u = 2; DESIGN.md regenerates with a room column.

## Open questions for fcalell

- **C1, the display ratio in room.** At 2.77 a room figure is 2.9× its meta label; the references' glance is 5–9× (FotMob, the story's own reference, 5.6×). Recommend a room-only display ratio of 5 (80 canvas units, 160 at 1920): the board is the glance, while 2.77 stays right for a stat inside a page.
- **C2, the page inset.** The safe area is 48 at the sides and 27 top and bottom; `page` is one role on both axes. Recommend one `page` of 48 all round: it costs 42 canvas units of a 540 height (8 %) and adds no role. The alternative is a `page-y` role used only by room.
- **C3, breakpoints.** Widths scale by `u` but container and media breakpoints are px literals, so at 1920 a Place's container queries see `wide` while its widths are doubled: a structure that splits at `wide` (Split, Place's beside column) overflows. Recommend that a room Place holds one structure, a single column of `Columns`, `Stats` and `Stat`, and never splits; the critique checks `/tv` at 1280, 1920 and 3840. The alternative, breakpoints that scale with `u`, needs every container query rewritten and is unverified (relative units in `@container` conditions).
- **C4, browser zoom.** A size in `vw` ignores browser zoom above the floor (WCAG 1.4.4 resize text). Accept for room: the screen is read from across a room, never zoomed, and the floor keeps it at least the touch set. Name it as a limit on the Place's `distance` doc.
- **C5, rounding.** `calc(N * u)` gives fractional px, so room line boxes leave the even-pixel rule. Accept: a TV scales the frame anyway.
