---
id: 003-38
status: backlog
sessions: {}
---
# native-ui: under reduced motion a sheet sizes once and shows its acts

## Goal
With the system's reduced motion on, the `confirm()` sheet first sizes to its head and body, then
grows when gorhom measures its footer: gorhom logs `animateToPositionCompleted … nextPosition:623`
but the view stays at 775.8, so Delete and Cancel sit off the screen (5 of 5 runs; motion on,
3 of 3 correct). Reanimated 4.4.1 ships `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: true`, so a value
set at once reaches the screen only on the next React commit, and today every sheet reaches the
screen only because `SheetBase`'s `onChange` commits. Found during 003-35.

## Approach
Decided by fcalell (2026-10-04): fix it in `SheetBase`'s structure, at no runtime cost; no feature
flag change, no upstream report. A sheet whose content cannot scroll (a `confirm()`, a short form)
holds its acts in the measured content, so dynamic sizing measures once; gorhom's sticky footer
stays only where the content can scroll (tall sheets, or a sheet at its height cap). Prove it on
the harness under reduced motion, and that menu and form sheets open without relying on the
`onChange` commit. The flag may be turned off in a local build as a diagnostic only.

## Acceptance criteria
- [ ] (live) under reduced motion, a `confirm()` and the Notes sheet show their acts on the emulator, light and dark, at 390 and 320 dp.
