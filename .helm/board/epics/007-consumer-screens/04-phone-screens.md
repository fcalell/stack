---
id: 007-04
status: done
sessions: {}
---
# stack: the phone half of the screen workbench

## Goal
A consumer's phone app gets what 007-01 and 007-02 give the web: every Expo route in each query
state from typed fixtures, and the same floors checked.

## Approach
Out of scope until the web half ships. What it would need: route discovery from the Expo routes,
a host (Storybook for React Native on a device, or React Native Web in the web workbench), and the
floors checked on a device the way the design critique drives one (`adb`, dp from the reported
density). The fixtures and forced query states of 007-01 carry over unchanged, since `plugin-api`'s
query client is shared.

## Acceptance criteria
- [x] The host and the device check are decided, with evidence, once 007-01 and 007-02 are done.

## Decided while building (2026-10-07), by the building session, each choice reviewed adversarially in fcalell's absence

Evidence: `.helm/research/phone-screens.md` (read from the repo, the installed packages and current
docs; no device was attached, so nothing below was run on one).

- The host is the phone app itself on the emulator, reached by deep link as the critique's phone
  path already does, with no Storybook of either kind. React Native Web misses the OS (safe-area
  insets, the keyboard, Android's font and its text wrapping, `Platform` branches) and drops
  `accessibilityState`, `importantForAccessibility` and `accessibilityElementsHidden` (the roster
  uses them 56, 13 and 13 times), so axe judges a tree TalkBack never sees. On-device Storybook
  is the real render but no route host (no memory router, no a11y addon, no headless runner) and
  adds a native build and a peer mismatch (reanimated 4.5.1 and safe-area-context 5.8.0 against
  the phone's 4.4.1 and 5.6).
- The fixtures carry over at the client's `fetch`, not MSW: the scaffolded client already takes
  one (`plugins/expo/templates/lib-api.ts`), and the screens plugin's `answer()` is already a
  `Request` to `Response` function over the same fixture tree, so one forced-state function
  serves both platforms. The state rides the deep link. MSW has no supported React Native
  integration to lean on (`msw/native` is unsupported; `@msw/react-native` is not on npm).
- The floors are read from `maestro hierarchy` at 390 and 320 dp (the density set live): bounds
  past the screen's edge, 44 dp and 24 dp targets from bounds, and an accessible name on every
  clickable element, which is the TalkBack tree. Contrast and text cut stay screenshot reads. It
  costs about ten minutes a route in five states, so it runs on the routes a change touches and
  on demand, never as part of `pnpm check`.
- `stack screens test` is unchanged and stays the check for the web half; its floors are never
  claimed for the phone.
- The host and the floors are decided; the fixture carry-over is a hypothesis until it runs.
  Before building: run `answer()` as the client's `fetch` in `apps/phone` and open `notes` in each
  state on the emulator. It decides whether Hermes has the `Response` bodies oRPC's codec writes;
  if not, the answer is built in a form Hermes has, never an MSW detour.
- Constraints the building session must meet, unresolved here: `lib-api.ts` is copy-once and
  consumer-owned, so the injection lives in stack's own `createVersionGatedFetch`
  (`plugins/expo/src/client/index.ts`), never in a line the consumer writes; it is gated so a
  production bundle carries no fixtures and no oRPC server (`answer.ts` imports `msw` at the top,
  so the phone path needs `answer` split from `fixtureHandlers`); the state comes from the deep
  link with no consumer config. A cheap headless layer for names and roles (expo-router's
  `renderRouter` with RNTL, which honours `accessibilityState`) was noted in the research but not
  weighed as a per-change check beside the emulator walk; it is open.

## Open questions
- [x] React Native Web in the web workbench or on-device Storybook: what each misses of a real
  phone render.
