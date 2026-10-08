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
- [ ] (live) web, deploys' Code copy at 1440: two copies one second apart keep Copied for two seconds after the second; unfolding with the keyboard leaves focus on the text in every frame.
- [ ] (live) phone, on the harness: two copies one second apart keep Copied two seconds after the second.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 1440: two copies a second apart hold Copied until 2 s after the second; a keyboard unfold moves focus fold, fold, text with no frame on the body. Open: the phone live criterion on the harness.

## Critique
Partial: every state the story feeds renders correctly; its timing criteria (throttled Escape, copy timing, the clock past `until`) were not driven.
