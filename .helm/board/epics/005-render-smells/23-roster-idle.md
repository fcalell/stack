---
id: 005-23
status: backlog
sessions: {}
---
# react-ui: the roster page goes idle once it has drawn

## Goal
The showcase's roster page (`/`) never goes idle: once its 4,822 cells render it commits about
15 times a second, the stack in Base UI's `closeOnPressOutside` and floating-ui's `autoUpdate`
from the frames that force popovers open. `waitForSelector` and CPU profiling time out on it, so
a design critique cannot measure the page, and the same loop would run in any app holding an
open popover. Found during 003-34.

## Approach
Find which forced-open popover keeps committing and why each commit triggers the next (an
`autoUpdate` reposition that sets state, or an outside-press listener re-binding each render).
Fix it in the component or the frame that forces it open, so an open popover re-renders only
when its anchor or content moves.

## Acceptance criteria
- [ ] (live) the roster page at 1440 commits nothing for 2 s once its first render settles, measured with a React commit counter.
- [ ] (live) a popover open in a layout page commits nothing while the pointer and the page are still.
