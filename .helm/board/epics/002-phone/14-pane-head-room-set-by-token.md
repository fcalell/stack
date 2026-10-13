---
id: 002-14
status: backlog
sessions: {}
---
# native-ui: a room Pane's head inset is a room-set token

## Goal
The native Pane's head adds `PAGE_HEAD_ROOM` when the density context says `room` (`far`), so the head's top inset is chosen by a read of `DistanceContext`. The context is data and stays, but the class should not be a per-component branch: a room Place sets the room spacing set, so the head's top inset should come from a spacing token that the room set redefines, as the web's `--spacing-*` variables do.

## Approach
Name a spacing role for the head's top inset in ui-core (`ui-core.md`, "The `room` density"), emitted per density set, and have `PAGE_HEAD` use it on both platforms so `PAGE_HEAD_ROOM` goes. Native's token emission already carries the room set; check that the Pane's head reads it with no `far` branch.

## Acceptance criteria
- [ ] The native Pane's head in a room Place stands the TV inset from the top with no read of `DistanceContext` in `pane/index.tsx`.
- [ ] `PAGE_HEAD_ROOM` is gone from ui-core and both Panes; `pnpm check` and each plugin's `pnpm verify` pass.
