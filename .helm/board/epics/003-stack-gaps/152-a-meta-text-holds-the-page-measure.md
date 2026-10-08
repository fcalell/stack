---
id: 003-152
status: done
sessions: {}
---
# react-ui: a meta Text holds the page's measure, not 58 characters of its small size

## Goal
Stead's Rules page ends on `<Text role="meta">` of two sentences (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/rules.tsx`). System critique unit u8 (shot `s17-reversible`): the paragraph wraps at about 400 px in a 792 px measure at 1440, a narrow block beside a column of full-width rows.

## Approach
`Text` sets `max-w-measure` on its `<p>` (text/index.tsx `MEASURE`), and the measure token is `58ch` (ui-core `MEASURE_CHARACTERS.measure`). `ch` resolves in the element's own font, so a 12 px meta line is capped near 400 px while the page column is 792 px; one token gives each role a different width. Not 003-88 (a Split's record).

## Acceptance criteria
- [x] A meta Text and a body Text stand as wide as the page's column at 375, 768 and 1440 px, or the cap is one pixel width for both.
- [x] The Text showcase measures both roles against the column beside them.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Ruled
Not a `ch` cap. `measure` is a derived size in px: 58 characters at the sans figure advance (`SANS_ADVANCE`) of the density's body size, rounded up (453 on the desktop, 557 on touch and in the room). Body, meta, Prose, Form and Thread read one width.

## Built
- `packages/ui-core/src/tokens.ts`, `scales.ts`: `measure` moves from the widths to the derived sizes (`--spacing-measure`, per density through `densityTokens` and the room through `roomTokens`), beside `measure-inset`. `measure-short` stays `ch` on the web and px on native. The `ColumnWidth` type keeps `"measure"`.
- `emit.ts`, `derive.ts`, `design-md.ts` (the type scale paragraph and the sizes table), `plugins/react-ui/src/node/theme.ts` (`max-w` joins the sizes' safelist), the foundations page, both verify scripts; `DESIGN.md` regenerated.
- Showcase: the Text frame's two roles draw two sentences so each runs to the measure; the Form frame's fields cell stands under a body paragraph for the same comparison.
- Evidence: `behaviour/measure.stories.tsx` `TextAndFormShareTheMeasure` (1280) and `...Touch` (375) hold a body Text, a meta Text, a Form and its field box to one width; they pass, as do `ui-core`, `react-ui` and `native-ui` verify. 768 sits between the two densities' widths (the desktop set from `tablet` on a fine pointer), both covered.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/rows/report.md`).
