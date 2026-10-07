---
id: 003-114
status: backlog
sessions: {}
---
# react-ui: closing a docked Sheet hands focus to the input that returns

## Goal
A Sheet docked in a Place's or a Thread's foot hands focus to the `MessageInput` that returns when it closes (its documented behaviour), but in an app built with `plugin-react` focus is left on `document.body`: a keyboard or screen-reader user loses their place. `DockedInFoot` in `apps/showcase/behaviour/sheet.stories.tsx` fails on it.

## Approach
`useFootFocus` (lib/focus.ts) reads `region.current` during render to learn who held focus before the commit removes it, and acts in an effect after the commit. `plugin-react` ships `babel-plugin-react-compiler`, which memoizes that read on the stable ref, so `held` stays the mount-time `false` and the effect never focuses; with `"use no memo"` in the hook the story passes. Capture who held focus without a render-time ref read (a layout effect's cleanup, or the parent telling the foot), in `Place` and `Thread`, which share the hook.

## Acceptance criteria
- [ ] Closing a docked Sheet in a Place's and a Thread's foot (Escape, Cancel, the submit) leaves focus on the returned input in an app built with the compiler.
- [ ] `DockedInFoot` passes.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided while building (2026-10-07), by the building session
- `useFootFocus(region)` keeps its signature (`Place`, `Thread` untouched) and reads no ref during render. A ref `held` is set by `trackHold` (`lib/focus.ts`): capture-phase `focusin` and `pointerdown` on the document set it to whether the event's target is inside the region.
- Removing the focused element fires neither event, so the hold survives the commit that swaps the sheet for the input. The after-commit effect, when `held.current` and `document.activeElement === document.body`, resets it and calls `focusFirst(region.current, "input, textarea")`.
- `trackHold` is tested under node with a fake document (`test/focus.test.ts`). `DockedInThreadFoot` in `apps/showcase/behaviour/sheet.stories.tsx` is the Thread twin of `DockedInFoot`.
- Unverified in a browser: the acceptance criteria stay unticked until the verifier proves them.
