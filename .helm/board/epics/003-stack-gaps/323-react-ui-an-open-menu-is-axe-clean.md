---
id: 003-323
status: review
sessions: {}
---
# react-ui: an open menu is axe-clean

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c2, c3 and c5) ran axe on every screen at 768 and wider and found `aria-hidden-focus` (serious) on Base UI's focus-guard spans, `span[data-base-ui-focus-guard][aria-hidden]`, whenever a header More menu or a Picker was open. The roster's own runs hid it with a recorded exclusion (003-113, `[data-base-ui-focus-guard]` in the showcase preview and the screens floors, each with a TODO for a Base UI release that never came), so a consumer's audit saw what the showcase did not.

## Approach
Base UI 1.8.0 draws the guards focusable and `aria-hidden` and has no prop to drop them (`utils/FocusGuard.js`). The relay matters (a Tab from the trigger or off the popup's edge moves focus through the guard's `onFocus`), so `tabindex` stays; what axe objects to is `aria-hidden` on a focusable element, so it comes off. `lib/guards.ts` is one document `MutationObserver` for every mounted popup, started by `useQuietGuards` in `MenuBase`, `Select` and both of the Picker's popups, which removes `aria-hidden` from a guard as it mounts. The guard is then an empty focusable span with no role, which assistive tech skips; each moves focus the instant it takes it.

## Acceptance criteria
- [x] With a Menu open at desktop width, axe's full run (document-structure rules aside) has no violation: the showcase's runs no longer exclude the guards.
- [x] The same for an open Picker (and Select, which the picker stories cover).
- [x] The guards stay focusable (`tabindex="0"`), so the Tab relay holds.
- [x] The exclusion, its constant and its TODOs are gone from the showcase preview, the state stories, the canvas stories, the screens floors and the guides.

## Built
`plugins/react-ui/src/ui/lib/guards.ts` (new) and its use in `menu/base.tsx`, `select/index.tsx` and `picker/base.tsx`. Removed: `apps/showcase/.storybook/focus-guard.ts` and every `FOCUS_GUARD` exclusion; `plugins/screens/src/ui/floors.ts` loses its exclude; `reference.md`, `screens.md` and `ui-core.md` say an open menu audits clean. Stories `OpenMenuHasNoHiddenFocusable` (`behaviour/menu.stories.tsx`) and `OpenPickerHasNoHiddenFocusable` (`behaviour/picker.stories.tsx`) leave the popup open, assert at least one guard stands, none is `aria-hidden` and each keeps `tabindex="0"`; the a11y run after them is the axe check. Measured before the fix with the exclusion removed: 8 of the menu and picker behaviour stories that leave a popup open fail with `aria-hidden-focus` (the two new ones, Pointer Open Draws No Ring, Blocked Item, Row End, Row Radius, Blocked 320 and 1440); after, menu, picker, select, shell and popups behaviour stories 33 of 33 pass.
Trade-off recorded: a guard no longer says "hidden"; VoiceOver's own path (Base UI sets `role="button"` and drops `aria-hidden` itself there) is unchanged. Native has no focus guards (the phone's popups are sheets), so the native box is not open.
