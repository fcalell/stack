---
id: 005-16
status: done
sessions: {}
---
# react-ui, native-ui: a blocked act's press is derived, not reset by an effect

## Goal
Every blocked act remembers a press so its Reason shows, and forgets it in an effect once
unblocked: web `Button` (`components/button/index.tsx:88-91`), `ActionBar` (`action-bar/index.tsx:62-67`),
`SheetBase` (`sheet/base.tsx:127-129`), `Section` (`section/index.tsx:188-190`), `Banner`
(`banner/index.tsx:53-55`), `PendingBar` (`pending-bar/index.tsx:62-64`); phone `Button`
(`button/index.tsx:92-96`), `ActionBar` (`action-bar/index.tsx:54-59`), `SheetBase`
(`sheet/base.tsx:423-425`), `PendingBar` (`pending-bar/index.tsx:53-56`). Each unblock renders
once with a stale press, then again. ActionBar's effect always sets a fresh `Set`, so every
ActionBar (every Form, Sheet and confirm) renders twice on mount; the phone ActionBar also builds
each act's `ReasonHostContext` value per render (`:79-84`). ActionBar runs an act through
`void ran.finally(…)` (web `:79`, phone `:67-70`), whose derived promise rejects unhandled when
the act fails.

## Approach
One shared rule: a press is stored as the reason it was pressed under, and the Reason shows
while `blocked` is that reason (or the form is touched), so unblocking or a new reason clears it
in render. Every site uses it, and the reset effects go. Each act's reason host is stable per
act. ActionBar settles a run with `then(done, done)` and hands the rejection back to the caller.

## Acceptance criteria
- [x] (test) the shared rule: a press under one reason shows it, and shows nothing once `blocked` is undefined or another reason, with no state change.
- [x] (test) neither plugin's Button, ActionBar, SheetBase, Section, Banner or PendingBar resets a press in an effect.
- [ ] (live) web, settings at 1440: a Form's ActionBar commits once on mount (React profiler).

## Progress
Built; `pnpm check` and `pnpm verify` pass, and both (test) criteria hold. Web live at 1440: a Form's ActionBar commits once on mount (master: twice), and the invite sheet's blocked Send shows its reason after a press and drops it once unblocked.
