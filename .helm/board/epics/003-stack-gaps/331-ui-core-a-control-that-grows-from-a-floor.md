---
id: 003-331
status: backlog
sessions: {}
---
# ui-core: a control that grows from a floor is checked against its floor only

## Goal
A control that wraps what it holds (a pick of several's trigger wrapping its chips) grows from the compact control's floor, so the render walk can only check it against the floor, not exactly: it cannot tell a correct height from a wrong one above the floor. It stands as a named exception in the walk (`control-height`, `py-hairline -my-hairline`).

## Approach
The exact check needs a "grows from" size token: the floor and the step each extra line adds, so the walk can ask whether the height is the floor plus whole lines. Decide whether that is a token in ui-core's sizes or the walk reading the line box; drop the exception when it holds.

## Acceptance criteria
- [ ] The walk checks a growing control's height as the floor plus whole lines, and a height between them is a finding.
- [ ] The control-height exception for the pick's trigger is gone, with a canary that a mis-sized grown control fails.
