---
id: 003-318
status: done
sessions: {}
---
# react-ui: the Gate's drawn lockup leads at 40 px and its lead is evenly spaced

## Goal
Stead's owner (2026-10-11) found the Gate's 24 px lockup read as a label on the sign-in page and asked for the lockup at 40 px, left-aligned, with even spacing between the lockup, the title, the description and the body.

## Owner ruling
Ruled in conversation with the owner; implemented directly without the queue.

- On the Gate only, a drawn lockup (the `logo` branch of `Lockup`) stands 40 px tall at every density, desktop and touch, left-aligned on the column's edge, its width from its own proportion and held to the column. The sidebar's lockup stays at the avatar's height. The plain form (icon and name as text) on the Gate keeps its size.
- On a Gate with a title, the lockup, the step count (when present), the title, the description and the body each stand one `fields` gap apart (16 px on the desktop, 24 on touch): the title to description gap rises from `pair` to `fields` and the lead to body gap falls from `sections` to `fields`. A Gate with no title (a first run) keeps its flow, and a banner keeps its `sections` gap to what follows it.

## Built
ui-core: the size token `gate-mark` (40 in both density tables, so `h-gate-mark` exists; the room set is the touch one) in `tokens.ts` with its use line in `design-md.ts`. `variants.ts`: `GATE_LOGO` is now the Gate's drawn lockup (`h-gate-mark w-auto max-w-full`), `SHELL_LOGO` (`h-avatar w-auto max-w-full`) is the sidebar's, and `GATE_LEAD` and `GATE_HEAD` give way to one `GATE_STEP` (`gap-fields`): the title and description are children of the stack with the lockup, the count and the body, no head wrapper. `GATE_FLOW` (`gap-sections`) still spaces the column's banner and what follows. The roster has the Gate hold `GATE_STEP` and `GATE_LOGO` and own `gate-mark` (no longer `pair`), the Shell draw `SHELL_LOGO`; `roster-invariants` lists `GATE_STEP`. DESIGN.md is regenerated.

react-ui: `Lockup` takes the drawn lockup's size cell from its caller (`logo`): the Gate passes `GATE_LOGO`, the Shell `SHELL_LOGO` (`lib/mark.tsx`, `components/gate`, `components/shell`). A titled Gate wraps its mark, count, title, description and body in one `GATE_STEP` stack; an untitled one draws its children straight in the column as before (so a title that appears from none remounts the body). native-ui's Gate takes the same `GATE_STEP` structure in place of the lead and head (the phone draws no mark), since the cells are shared; its screens are not rendered here.

Tests: showcase `behaviour/mark.stories.tsx`: the Gate's drawn lockup is 40 px tall and starts at the title's left edge, stays 40 on touch, the Gate's parts stand one 16 px gap apart (lockup, count, title, description, body), and the sidebar's plain logo is 24 px.

Docs: `plugins/react-ui/guide/rules.md` and `plugins/native-ui/guide/rules.md` (the Gate), `plugins/react/guide/web-app.md` (the `logo` row), `.helm/knowledge/architecture/ui-core.md` (the app's mark, the Gate), the Gate's JSDoc.

## Review
2026-10-11: ui-core `pnpm verify` 34/34 (its size count is 43), react-ui verify 13/13, native-ui verify 19/19; `pnpm check` passes (45 tasks) and Biome is clean. Browser, filtered: `behaviour/mark.stories.tsx`, `gate`, `not-found`, `form-leave`, `sheet` and `stories/Gate` 61 of 61 in Chromium; `stack screens test` 180 of 180 (no committed screen baselines). The phone's Gate was not rendered. No design critique ran: none played by a session apart from the work.
