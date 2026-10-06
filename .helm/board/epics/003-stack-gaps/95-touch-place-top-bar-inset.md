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

## Acceptance criteria
- [ ] On touch, the back glyph's start meets the title's start and the end act's glyph meets the gutter's end.
- [ ] A bar with no end acts does not draw a bare strip over the title (the title shares its row or the strip collapses).

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
