---
id: 003-181
status: review
sessions: {}
---
# react-ui: a touch Place's more act shares the title's row

## Goal
Stead's Now page is a `Place` titled "Now" with its `more` (github.com/fcalell/stead, `packages/server/src/app/routes/_now/route.tsx:96`). At 390 px the "⋯" stands alone on a strip above the title, about 44 px of chrome holding one glyph, and with the shell's banner above it the page spends about 160 px before its first section. Evidence: Stead's Now critique unit u2 at stack `74a0e3d`, shots `/tmp/claude-1000/-home-fcalell-projects-stead/b4731445-cb1e-4c58-8388-ae8329ae98ea/scratchpad/critique/u2/shots/now-390-light.png` and `/tmp/claude-1000/-home-fcalell-projects-stead/b4731445-cb1e-4c58-8388-ae8329ae98ea/scratchpad/critique/u2/shots/end-390-light.png`.

## Approach
003-95 (done) aligned the touch top bar's acts to the gutter, and 82f53e58 drew no strip for a Screen with nothing in its bar. A Place whose bar holds only its `more` still draws the full strip over its title. The app passes the title and the act; it has no say in the bar's rows.

## Acceptance criteria
- [x] At 320 and 390 px, a touch `Place` with no back act stands its `more` on the title's row, with the title wrapping before them, and keeps the 44 px targets.
- [x] A Place or Screen with a back act is unchanged (changed by the ruling, see Ruled: a back act with no switcher stands ahead of the title on the row).
- [ ] The Place showcase holds both, measured by the critique.

## Open questions
- [x] Its shape: the stack session decides.

## Ruled
The derivable fact is the switcher, not the back act (the web draws the back act always and shows it by the Split's marks). A touch Place with no shell switcher (and not `distance="room"`) is one row: back (when shown), title or title line (wraps), then the actions, Details and more. A Place with a switcher, a room Place and the Screen are unchanged. If the critique fails a back-plus-title row, the fallback is the story's narrower shape on the phone only, which returns to the owner.

## Built
react-ui `components/place/index.tsx`: `single = !touch || (!far && !switcher)` puts the title in the bar's row (the acts in one `ACTS` span; the title line under the bar only when not single). On touch in this form the back act takes `PAGE_TOP_BAR_START`, the acts `PAGE_TOP_BAR_END`, the row drops `PAGE_TOP_BAR_TOUCH` and the title drops `PAGE_TITLE` and `truncate`. native-ui `components/place/index.tsx` merges the `bar` View and the title the same way when there is no switcher. `PAGE_TOP_BAR_START` (`-ms-icon-inset`) and `PAGE_TOP_BAR_END` (`-me-icon-inset`) are new cells in `ui-core/src/variants.ts`, listed in `Place`'s roster draws; `DESIGN.md` regenerated; one clause in react `rules.md` and `ui-core.md`. `behaviour/place.stories.tsx` holds both forms at 320 and 390.
Evidence (px): at 320 a five-line title: head 141, title 16 to 160, Filter 44x44 from 168, More 44x44 ending 316 of 320, first section at 16; at 390 a three-line title: head 85, Filter from 238, More ending 386 of 390. A one-line title head is 45 px against 81 px under a shell switcher (36 px less before the first section). Stories pass (Place, Shell, and every story the diff reaches: 106 files, 403 tests, peak 3984 MiB).
Not measured: the critique's call on a back-plus-title row (the Split stories with a record open pass); native is not rendered (no browser run for the phone).

## Owner ruling
The owner keeps the ruled shape: a back act with no switcher stands on the title row. The critique judges the back-plus-title row; the native form is not rendered.

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique: a wrapping title butts the touch head's edges: a 3-line h1 of 84 px in an 85 px head at 390, 140 in 141 at 320; the acts are centred vertically in the tall head, not on the first line; the h1 column is 144 of 320 px. The single-row form is met (head 45, acts 44, h1 at x16).

## Owner ruling
The owner rules rework; the shape stays. When the title wraps, the head gets block padding of at least one `inside` step (8 px) above and below the title block (a 3-line h1 at least 100 px in a head at least 116 px at 390; the same relation at 320). The acts align to the first title line (the 44 px act centred on the first line box, top-anchored), not the head's centre. The h1 column stays at least 2/5 of the row. The single-row form is unchanged (head 45, acts 44, h1 at x16). Put it in the shared title cell (TITLE_WRAP / PAGE_TITLE_FLOOR) so the Screen (003-304) inherits it; add one wrapped-title Screen story; 003-304's Screen stories stay green.
