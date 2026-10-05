---
id: 003-56
status: done
sessions: {}
---
# ui-core: a display figure

## Goal
One figure at the display role with its label, the TV board's focal point ("2 need you"), at `/tv` above Needs you. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
The contract defines a `display` role, one per screen in tabular figures, and no component draws it. `Count` is a caption pill in a heading row; `Text` takes `body` and `meta`; `ItemHeader`'s facts are `meta`; `Meter` is a bar; a `Section`'s count is a caption beside its heading.

Reference: Plain's "Queue size 6" figure with its words ([screen](https://mobbin.com/screens/e892500e-f820-4e3e-af83-973bf50ed22e)); FotMob's lock-screen time ([screen](https://mobbin.com/screens/fbef6a0e-13dc-42d0-b640-a4577310cccc)); Strava's figures ([screen](https://mobbin.com/screens/2f0e5080-5c7c-45f7-abae-9693533b8298)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Shape
New `Stat { label: string; value: number; unit?: string }`: the figure at the `display` role in tabular figures, its label under it (figure first, read "2, need you"), gap `pair`. One per screen. Range: `patterns/stats.md`.
