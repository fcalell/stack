---
id: 003-57
status: backlog
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
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
