---
id: 003-86
status: backlog
sessions: {}
---
# ui-core: leaving an edited form asks once

## Goal
Stead's `useLeaveGuard` in `edit-text.tsx` (github.com/fcalell/stead, `packages/server/src/app`) stops a leave from an edited form: a capture-phase anchor interceptor plus `beforeunload`, then a `confirm()` with "Keep editing". Every form with edits has the same need, and the guard is a workaround the app carries for a behaviour stack could own. Story 61's in-place routing bypasses an anchor interceptor on a router back.

## Approach
Story 72 gives `Confirmation` a `cancel` label, so the app can word the way out. The guard itself is the part to build: a `Form` that knows it is edited raises the question once when its page is left, with words `discardEdit` and `keepEditing`, so the app passes nothing. It reads the router's navigation on the web, since the app's interceptor cannot see a router push, and the phone's back and its navigation events.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
