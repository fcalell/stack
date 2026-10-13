---
id: 003-329
status: backlog
sessions: {}
---
# ui-core: the motion rules

## Goal
An open decision for the owner. `judging.md` lets only `transform` and `opacity` animate and allows one authored moment a screen, so a colour never transitions and the settle spends the page's one moment. The rules mix two kinds: taste (what may animate, how many moments) and performance (what is cheap to animate). Taste rules stop real design work (a colour change on state, a clip-path reveal) that the performance rule has no reason to stop.

## Approach
The proposal on the table: lift the taste rules and keep the performance rule.
- Colour, `clip-path` and `filter` may transition; there is no one-moment cap, and `judging.md` asks whether each motion explains a change.
- Size and position change only through a view transition or a transform, never by animating width, height, top or left.
- Durations come from the motion scale and reduced motion snaps.
- Motion stays as contract tokens in the cells, CSS and View Transitions on the web and Reanimated on native; a web animation library only when a gesture-driven interaction is designed.
If the owner agrees, `judging.md` (Motion), `rubric.md` and `ui-core.md` change with it, and the walk may check what it can (a transitioned property outside the allowed list).

## Acceptance criteria
- [ ] The owner decides: the proposal, a part of it, or the current rules.
- [ ] The decided rules stand in `judging.md`, with the knowledge entry and the cells that carry them updated in the same change.
- [ ] A rule a check can hold is held by one, with a test that it fails on a bad case.

## Open questions
- [ ] Whether the owner accepts the proposal above or keeps the one-moment cap.
