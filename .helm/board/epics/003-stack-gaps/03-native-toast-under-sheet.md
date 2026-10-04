---
id: 003-03
status: review
sessions: {}
---
# native-ui: a toast raised while a sheet is open is drawn under it

## Goal
The phone side of 003-01. gorhom's `BottomSheetModalProvider` renders its portal host after its
children, among them the Shell's toasts' layer, so an open sheet covers a toast. React Native's
`zIndex` orders siblings only, so the web's layer order has nothing to act on. The sheet's layer
is `accessibilityViewIsModal`, which also hides the toast from VoiceOver.

## Approach
Structural: the toasts render after the sheets, e.g. through the same portal host, or as a
full-window overlay. Recorded under Limits in `.helm/knowledge/architecture/ui-core.md`; that entry
goes when this lands.

## Acceptance criteria
- [ ] (live) a toast raised while a sheet is open stands over it and takes its dismiss.
