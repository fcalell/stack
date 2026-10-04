---
id: 003-38
status: backlog
sessions: {}
---
# native-ui: under reduced motion a sheet that grows after mount draws at its new height

## Goal
With the system's reduced motion on, the `confirm()` sheet first sizes to its head, then grows
to fit its acts: gorhom logs `animateToPositionCompleted … nextPosition:623`, but the view stays
at 775.8, so Delete and Cancel sit off the screen (5 of 5 runs; motion on, 3 of 3 correct).
Under reduced motion Reanimated 4.4.1 sets the value at once, and it reaches the screen only on
the next React commit. Found during 003-35.

## Approach
Likely Reanimated's `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`, on by default since 4.3.0
(software-mansion/react-native-reanimated#10444, #9614); untested, since the flag needs a native
rebuild. Options: the flag off, Reanimated below 4.3, `overrideReduceMotion` with zero-length
timings in `SheetBase` (routes around the bug), or an upstream report with a reproduction.

## Acceptance criteria
- [ ] (live) under reduced motion, a `confirm()` shows its acts on the emulator.
