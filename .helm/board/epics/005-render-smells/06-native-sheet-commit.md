---
id: 005-06
status: backlog
sessions: {}
---
# native-ui: a sheet paints without an incidental commit

## Goal
Under reduced motion every phone sheet reaches the screen only through the commit that
`BottomSheetModal`'s `onChange` triggers, `setSettled(index >= 0)` at
`components/sheet/base.tsx:470`, with the comment "the mechanism is undiagnosed" (`:468-469`).
Reanimated 4.4.1 ships `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: true`, so a value set at once
reaches the screen only on the next React commit. A read of Reanimated's source suggests a
deferred frame flushes right after the paused commit mounts and the value never reaches the
registry or is reverted (`propsToRevert`, `performNonLayoutOperations`). Found in 003-35 and
003-38.

## Approach
Decided by fcalell (2026-10-04): diagnose with local Reanimated builds only, and ship no flag
change. On the harness, with a reduced-motion case that resizes an open sheet, build with
`DISABLE_COMMIT_PAUSING_MECHANISM`, then with `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` off,
and name the path that drops the value. Then restructure `SheetBase` so the sheet's position
reaches the screen by its own update: `settled` keeps only its job of picking the leave timing,
and nothing paints because of it. The comment goes with the dependency.

Needs the phone harness (x86_64 Linux): the diagnosis runs local Reanimated builds on the emulator.

## Acceptance criteria
- [ ] (file) `.helm/research/` records the diagnosis: the builds tried, what each showed, and the path that drops the value.
- [ ] (live) on the harness under reduced motion, with `onChange` committing nothing, a `confirm()` and the Notes sheet open and resize to their measured height, 5 of 5 runs, at 390 and 320 dp.
