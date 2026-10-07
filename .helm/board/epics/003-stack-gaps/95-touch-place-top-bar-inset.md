---
id: 003-95
status: backlog
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
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
