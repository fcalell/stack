---
id: 003-01
status: backlog
sessions: {}
---
# react-ui: a toast raised while a sheet or a confirm is open is drawn under it

## Goal
screen.md step 5 says an act's failure is "a toast for an act". In the notes app
(`src/app/routes/index.tsx`), Add note runs inside a `Sheet` and Delete note inside a
`confirm()`. A `toast(…, { state: "failed" })` called from either act's `onAct` lands in the
Shell's toast layer inside `<main>`. On the desktop that layer stands at the bottom-right, under
the scrim and behind the 640 px side sheet. Base UI's modal also marks it `aria-hidden`. So the
viewer never sees the failure: the toast is in the DOM, invisible, and it times out before the
sheet closes. A toast raised with no sheet open draws correctly.

## Approach
- Tried: `toast()` from the sheet's `submit.onAct` and from the confirm's `act.onAct`. In both, the toast is present in `[aria-label="Notifications"]` but covered.
- The app now draws the add failure as a `Banner kind="danger"` at the top of the sheet's `Form`, which works.
- For delete, the act rejects as the `Confirmation` contract says ("stays open, the act ready again, when it rejects"), so the confirm stays open and its failed toast stands unseen beneath it: the viewer gets no message.
- `Confirmation` has no slot for a failure sentence.
- Reference: toast-and-banner pattern page (toasts stand over everything at the corner).

## Acceptance criteria
- [ ] A toast raised while a sheet or confirm is open is visible and announced. Or a confirm whose act rejects draws the failure itself, so it can stay open as its contract says.

## Open questions
- [ ] Toasts above modal layers, a failure line on `Confirmation`, or both: the stack session decides.
