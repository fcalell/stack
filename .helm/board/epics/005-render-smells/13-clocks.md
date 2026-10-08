---
id: 005-13
status: review
sessions: {}
---
# react-ui, native-ui: a pending bar and an age read one clock

## Goal
- Web `PendingBar` keys its one-second interval on the `until` Date object
  (`components/pending-bar/index.tsx:57-61`): an inline `new Date(…)` restarts it every parent
  render, and a parent rendering faster than a second freezes the clock and fill. Past `until`
  it ticks forever at 0:00, and the fill steps once a second (`PENDING_FILL` has no transition,
  `packages/ui-core/src/variants.ts:448`).
- Phone `PendingBar` seeds `start` and `now` at mount (`pending-bar/index.tsx:49-50`, interval
  `:62-66`): for a second after mount or a new `until` it draws `end - mountTime`, and a later
  `until` makes the fill jump (`:68-71`, `:95`).
- `age()` reads `Date.now()` at render (web `lib/age.ts:14`, phone `lib/age.ts:19`) and nothing
  re-renders it: "2 minutes ago" stays until an unrelated commit.

## Approach
One shared coarse clock, an external store read with `useSyncExternalStore`, ticks every live
pending bar and age together and stops when nothing past-due reads it. A bar's share and text are
a pure function of `start`, `until` and now, keyed on `until`'s time. The fill moves continuously
by itself, a CSS width transition on the web and a Reanimated animation on the phone, from
`start` to `until`; the tick redraws only the text.

Decided (the recommended answer, applied 2026-10-04): an age ticks live from one shared coarse clock.

## Acceptance criteria
- [x] (test) the bar's share and clock text, and an age's words, are functions of their times and now, shared by both plugins.
- [ ] (live) web, deploys' PendingBar at 375: the fill moves smoothly, the clock is right in the first second, and nothing ticks past 0:00; a "just now" age turns to "1 minute ago" on its own.
- [ ] (live) phone, on the harness: the same on a PendingBar whose `until` is set after mount.

## Progress
Built; `pnpm check` and `pnpm verify` pass. The web timing criteria (the clock in the first second, the fill's motion, nothing ticking past 0:00, an age turning on its own) are not run. `useClock` (lib/clock) and `useReducedMotion` (lib/media) are public lib subpaths. Open: the phone live criterion on the harness.
Open: the timing criteria wait for the live critique.

## Critique
Partial: every state the story feeds renders correctly; its timing criteria (throttled Escape, copy timing, the clock past `until`) were not driven.
