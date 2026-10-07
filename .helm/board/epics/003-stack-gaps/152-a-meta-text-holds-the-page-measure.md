---
id: 003-152
status: backlog
sessions: {}
---
# react-ui: a meta Text holds the page's measure, not 58 characters of its small size

## Goal
Stead's Rules page ends on `<Text role="meta">` of two sentences (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/rules.tsx`). System critique unit u8 (shot `s17-reversible`): the paragraph wraps at about 400 px in a 792 px measure at 1440, a narrow block beside a column of full-width rows.

## Approach
`Text` sets `max-w-measure` on its `<p>` (text/index.tsx `MEASURE`), and the measure token is `58ch` (ui-core `MEASURE_CHARACTERS.measure`). `ch` resolves in the element's own font, so a 12 px meta line is capped near 400 px while the page column is 792 px; one token gives each role a different width. Not 003-88 (a Split main's record).

## Acceptance criteria
- [ ] A meta Text and a body Text stand as wide as the page's column at 375, 768 and 1440 px, or the cap is one pixel width for both.
- [ ] The Text showcase measures both roles against the column beside them.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
