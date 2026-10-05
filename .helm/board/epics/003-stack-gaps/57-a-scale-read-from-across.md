---
id: 003-57
status: review
sessions: {}
---
# ui-core: a scale read from across a room

## Goal
Type and sizes for the `/tv` route on a television, read from metres away. `/tv` and `/tv/views/<lead>/<view>`. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
The touch density, drawn because the kiosk's pointer is not fine, is body 16 and title 22, sized for a phone at arm's length, about half a ten-foot interface's body; a kiosk with a mouse attached draws the desktop set at 13. `data-density` is the showcase's pin, never a consumer option. The four knobs scale no type.

Reference: FotMob's lock screen, its time about five times its date ([screen](https://mobbin.com/screens/fbef6a0e-13dc-42d0-b640-a4577310cccc)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Shape
A third density `room`, declared by the screen: `Place.distance?: "room"`. Media queries cannot detect viewing distance, so desktop and touch stay automatic and room is the one tier a screen states. The web emits it under `[data-density="room"]` set by the Place, the phone scopes it with uniwind `ScopedVariables`. Range: `patterns/ten-foot.md`.

The room set is the touch set drawn on a 960 × 540 canvas and scaled to the screen by `u = max(1px, min(100vw / 960, 100dvh / 540))` (on the phone from `useWindowDimensions`); at 1920 × 1080 `u` is 2 (body 32, title 44, control 88, row 96). In room only the `display` ratio is 5, so a glanceable figure stands 5× its label. `page` is 48 canvas units all round. A room Place holds one structure and never splits, since breakpoints stay px while widths scale. Two named limits: `vw` sizes ignore browser zoom, and `calc` sizes leave the even-pixel rule. The derivation, every input and the structures that change: the room density bullet in `.helm/knowledge/architecture/ui-core.md`. A critique by a fresh session judges `/tv` at 1280, 1920 and 3840 once built.
