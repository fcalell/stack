---
id: 003-86
status: review
sessions: {}
---
# ui-core: leaving an edited form asks once

## Goal
Stead's `useLeaveGuard` in `edit-text.tsx` (github.com/fcalell/stead, `packages/server/src/app`) stops a leave from an edited form: a capture-phase anchor interceptor plus `beforeunload`, then a `confirm()` with "Keep editing". Every form with edits has the same need, and the guard is a workaround the app carries for a behaviour stack could own. Story 61's in-place routing bypasses an anchor interceptor on a router back.

## Approach
Story 72 gives `Confirmation` a `cancel` label, so the app can word the way out. The guard itself is the part to build: a `Form` that knows it is edited raises the question once when its page is left, with words `discardEdit` and `keepEditing`, so the app passes nothing. It reads the router's navigation on the web, since the app's interceptor cannot see a router push, and the phone's back and its navigation events.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided while building (2026-10-07), by the building session
The shape is `Form` behaviour: no prop, variant, token or component, and the app passes nothing.
- `@fcalell/ui-core/leave` (`createLeave()`) is the pure state: `edit` (a field took input), `press`/`settle(rejected)` (the `ActionBar`'s filled act), `asks` (edited and no act running) and `attempt(ask)` (one question per leave; a second attempt while it is open is held without asking; a discard clears the edit). Tests: `packages/ui-core/test/leave.test.ts`.
- Each plugin's `useTouchState` (the native sheets now use it too) holds one `Leave` beside `touched`; `touch` edits both, so "touched" still only shows a blocked act's reason. The filled act clears the edit before it runs and puts it back on a throw or rejection, so a sync act that navigates, or an async one that navigates after resolving, is never asked.
- The question is a `Confirmation` (`discardEdit`, the `editUnsaved` sentence, a destructive `discard` act, `cancel: keepEditing`) through a new `ask()` in each `lib/confirm.ts`, which resolves with the answer where `confirm()` returns nothing, and resolves `true` when no Shell or Gate hosts the queue.
- Web: `blockLeave` in `lib/navigate.ts` registers the bound router's `history.block` (async `blockerFn`, truthy holds; `enableBeforeUnload` true only while the form asks), verified against @tanstack/history 1.162.4. Unbound it is a `beforeunload` listener only. Phone: `useNavigation().addListener("beforeRemove")` prevents, asks, and a discard dispatches `event.data.action`; type-checked only, no device.
- Limits: a `Form` inside a sheet asks nothing; two edited forms on one page each ask; on the phone a tab switch removes no screen and so asks nothing.
- Proof: the ui-core, react-ui (`test/navigate.test.ts`, `test/leave.test.ts`) and native-ui (`test/leave.test.ts`) node tests, and `apps/showcase/behaviour/form-leave.stories.tsx` (not run in a browser by this session).
