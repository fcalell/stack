---
id: 005-12
status: review
sessions: {}
---
# react-ui, native-ui: Copied holds two seconds from the last copy, and Code unfolds without a frame wait

## Goal
`useCopy` keys its two-second reset on the boolean `done` (web `lib/copy.ts:13-18`, phone
`lib/copy.ts:15-19`). A second copy inside the window sets `done` to true again, the effect does
not re-run, and Copied clears two seconds after the first copy. Every copy act inherits it
(`Code`, `DefinitionRow`). On the web, unfolding a `Code` block calls `setUnfolded(true)` and
focuses the text a frame later (`components/code/index.tsx:129-131`), though the `<pre>` is
already mounted: for that frame the fold button is gone and focus drops to the page.

## Approach
A copy's state is its moment (a timestamp or a counter), and the reset is keyed on it, so each
copy restarts the window. Code focuses its text in the click handler, before unfolding, so the
button's removal cannot drop focus; the `requestAnimationFrame` goes.

## Acceptance criteria
- [x] (live) web, deploys' Code copy at 1440: two copies one second apart keep Copied for two seconds after the second; unfolding with the keyboard leaves focus on the text in every frame.
- [ ] (live) phone, on the harness: two copies one second apart keep Copied two seconds after the second.

## Progress
Built; `pnpm check` and `pnpm verify` pass. The web timing criteria (two copies a second apart, a keyboard unfold's per-frame focus) are not run. Open: the phone live criterion on the harness.
Open: the timing criteria wait for the live critique.

## Critique
Partial: every state the story feeds renders correctly; its timing criteria (throttled Escape, copy timing, the clock past `until`) were not driven.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique partial: the copy timing was never driven. The web timing box stays open; the phone box stays open.

## Owner ruling
The owner rules rework: prove timing in behaviour stories with a test clock, not a CPU throttle. Web: two copies 1 s apart show Copied at +1.9 s after the second and gone by +2.1 s; a keyboard unfold keeps focus on fold, then text, document.body never active. The web box ticks on a pass; the phone box stays open.

## Built (rework)
Driven in `apps/showcase/behaviour/code-copy.stories.tsx` on the held test clock (`behaviour/clock.ts`). `CopiedHoldsFromTheLastCopy`: copy, +1 s, copy again; Copied still shows at +1.9 s after the second and is gone at +2.1 s. `CopiedClearsAfterTwoSeconds`: one copy holds 1.9 s and clears by 2.1 s. `UnfoldKeepsFocus`: a keyboard unfold of a `tail` Code, sampling `document.activeElement` at every DOM mutation and every animation frame: it is only ever the fold button, then the text, which ends focused; the body is never active. 3 of 3 pass in Chromium. No code change was needed. Phone box stays open (native not rendered).
