---
id: 003-35
status: backlog
sessions: {}
---
# native-ui: a Sheet opens on the device

## Goal
On the Android emulator (phone-render harness), `apps/phone`'s "New note" act sets the Sheet's
`open`, `SheetBase` calls `ref.current.present()` on a non-null ref, and nothing mounts:
`BottomSheetModal`'s `onChange` never fires, the hierarchy holds no sheet nodes, and Metro and
logcat show no error, with reduced motion on or off. `confirm()` uses the same code, so no phone
decision opens. Blocks 003-03's live criterion.

## Approach
Ruled out: providers (GestureHandlerRootView, BottomSheetModalProvider at the root and in the
Shell), duplicate copies of gorhom, reanimated and gesture-handler, `enableDynamicSizing` and
`containerComponent`. Stack: @gorhom/bottom-sheet 5.2.14, react-native-reanimated 4.4.1,
react-native-gesture-handler 3.0.0, RN 0.85.3. A closed gorhom issue
(github.com/gorhom/react-native-bottom-sheet/issues/2546) reports sheets not opening on
Reanimated 4.3+. Find the cause on the harness; the Shell's nested provider (003-03) is a suspect.

## Acceptance criteria
- [ ] (live) the Notes sheet and a `confirm()` open on the emulator, and 003-03's toast stands over the open sheet and takes its dismiss.
