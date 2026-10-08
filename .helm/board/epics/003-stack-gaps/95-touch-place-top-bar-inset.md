---
id: 003-95
status: done
sessions: {}
---
# react-ui: a touch Place's top bar acts align to the page gutter

## Goal
At 375 px the Place top bar's back chevron and its more/edit icon buttons draw their glyphs ~22 px inside the page gutter (unbled 44 px icon buttons), so they misalign with the title's start and the right edge, and the bar is a near-empty strip over the title. Stead: `routes/system/*` (Rules, Leads), the page screen (`packages/server/src/app`). Screens: Stead's sign-off set (scratchpad `signoff/`): `rules-375-light`, `leads-375-light`, `page-375-light`; the strip reads in `rules-375-light` (chevron at x≈75 over a title at x≈33).

## Approach
`PAGE_HEAD` = `px-page border-b border-edge` and `PAGE_TOP_BAR` = `gap-acts min-h-strip` (place/index.tsx) put the 44 px icon-button boxes at the gutter, not their glyphs, with nothing bleeding them. The app passes only acts and a title.

Seen again at stack `5564217` (Stead step 5b, critique unit u6, Work at 390 px, shots `list-390-light`, `m-card` in Stead scratchpad `critique/u6/shots/`): the Place head draws "New story", back and Details on a line of their own above the title "Work" (acts at y 153, title at y 190), 44 px of head before the toolbar, and with the usage banner (130 px) the first row starts at y 296 of 800; design/07-interface.md draws "Work ✎ ⋯" on one line. 003-134 covers a record beside the main only, so the bare strip stays here.

## Acceptance criteria
- [ ] On touch, the back glyph's start meets the title's start and the end act's glyph meets the gutter's end.
- [ ] A bar with no end acts does not draw a bare strip over the title (the title shares its row or the strip collapses).

## Open questions
- [x] Its shape (a component, a variant, a token, an option): a derived size token, `icon-inset`, and one cell, `PAGE_TOP_BAR_TOUCH`; no prop.

## Built
`icon-inset` is half of what the control has over its icon (12 px on touch). `PAGE_TOP_BAR_TOUCH` (`-mx-icon-inset`) reaches the touch top bar across the page inset by it, so the back glyph's start meets the title's start and the end act's glyph meets the inset's end; `SWITCHER` keeps the same inset as padding, so the shell's switcher avatar stays at the inset. A touch bar holding nothing draws no strip: the web Place already hid it, the web `Screen` now stands its bar only while it holds an act or a mark shows one (`ROW_MARKED`), and the native `Screen` draws no empty bar. Changed in `packages/ui-core/src/{tokens,scales,variants,roster,design-md}.ts` (and `scripts/verify.ts`), `plugins/react-ui/src/ui/components/{place,screen}/index.tsx`, `plugins/native-ui/src/ui/components/{place,screen}/index.tsx`. `pnpm check` (turbo part), the three `verify` scripts and the Place, Screen and Shell stories pass. The glyph alignment at 375 px is the critique's to measure.
- [x] On touch, the back glyph's start meets the title's start and the end act's glyph meets the gutter's end.
- [x] A bar with no end acts does not draw a bare strip over the title (the title shares its row or the strip collapses).

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/shell/report.md`).
