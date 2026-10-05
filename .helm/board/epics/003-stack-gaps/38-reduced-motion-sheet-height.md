---
id: 003-38
status: done
sessions: {}
---
# native-ui: a sheet sizes once, shows its acts under reduced motion and rises above the keyboard

## Goal
With the system's reduced motion on, the `confirm()` sheet first sizes to its head and body, then
grows when gorhom measures its footer: gorhom logs `animateToPositionCompleted … nextPosition:623`
but the view stays at 775.8, so Delete and Cancel sit off the screen (5 of 5 runs; motion on,
3 of 3 correct). Reanimated 4.4.1 ships `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: true`, so a value
set at once reaches the screen only on the next React commit, and today every sheet reaches the
screen only because `SheetBase`'s `onChange` commits. Found during 003-35.

The sheet also rises above the keyboard: focusing the Notes sheet's Title field opened the
keyboard over the sheet, covering its field and acts.

## Approach
Decided by fcalell (2026-10-04): fix it in `SheetBase`'s structure, at no runtime cost; no feature
flag change, no upstream report. A sheet whose content cannot scroll (a `confirm()`, a short form)
holds its acts in the measured content, so dynamic sizing measures once; gorhom's sticky footer
stays only where the content can scroll (tall sheets, a sheet at its height cap, or content the
keyboard covers). Why every sheet reaches the screen only through `onChange`'s commit is out of
this story: it is a finding in `.helm/research/render-smells.md`.

## Acceptance criteria
- [ ] (live) under reduced motion, a `confirm()` and the Notes sheet show their acts on the emulator, light and dark, at 390 and 320 dp.
- [ ] (live) with the keyboard open, the sheet's focused field and its submit stand above it, at 390 and 320 dp.

## Progress
Built and `pnpm check` passes: the foot and a decision's acts sit in the measured content, so the
sheet sizes once (confirm showed its acts under reduced motion, 5 of 5 on the harness, before the
stable-slot and keyboard edits); Head, Footer, Scrim and Foot are stable module components fed by
a per-instance store; a sheet the keyboard covers moves its foot to gorhom's footer. Open: both
live criteria on the harness (x86_64 Linux).
