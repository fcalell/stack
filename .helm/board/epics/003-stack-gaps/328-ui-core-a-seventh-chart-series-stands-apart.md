---
id: 003-328
status: review
sessions: {}
---
# ui-core: a seventh chart series stands apart

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c3) found Usage's "Code by stage" chart, seven series, drawing Adversary and Review in the same teal: `CHART_SERIES` has six fills (the chip hues) and a series past the sixth takes `at % 6`, so the seventh repeats the first and two series are indistinguishable in the bars and the legend.

## Approach
The six chart fills are the six chip hues, and no seventh hue is free: the chip hues stand at 25, 85, 145, 195, 305 and 350 degrees and leave the accent's 215 to 290 band out so no family wears the accent's colour (`CHIP_HUES`). So the seventh series is not a seventh hue but the neutral family's grey: `chart-neutral`, the cast hue at the neutrals' chroma, lightness chosen so it holds 3:1 on `surface` and `group` in both modes. `CHART_SERIES` gains `neutral` after `red`, `CHART_FILL` its `neutral` variant (`bg-chart-neutral`), the colour list its token (93 colours), and a chart past seven series repeats the cycle as before.

## Decision for the owner (flagged)
"Distinct hues within the chart palette rules" cannot be met literally with a seventh hue: the rules (the accent band left out, a chart fill is a chip hue) leave six. I took the neutral grey as the seventh, which keeps both rules (it is a chip family and wears no hue). A true seventh hue (a blue) would have to enter the accent's 215 to 290 band or move the six, a palette decision I left to the owner; if taken, `chart-neutral` becomes that hue and nothing else here moves.

## Acceptance criteria
- [x] Seven series draw seven distinct fills in the legend dots and the stacked parts, in both modes.
- [x] `chart-neutral` holds 3:1 on `surface` and `group` in both modes (ui-core `verify`).
- [ ] Native the same (it reads `CHART_SERIES` and `chartFill`, so the cell is shared; unrendered).

## Built
`packages/ui-core/src/tokens.ts` (`CHART_SERIES`, the chart colour group, `CHART`'s neutral lightness, `chartColors`), `variant-tables.ts` (`CHART_FILL.series.neutral`), `design-md.ts`, `scripts/verify.ts` (the colour count, the series-are-chip-hues-and-the-grey check, the cast literals now include `chart-neutral`), the README, `ui-core.md`; `DESIGN.md` regenerated. Story `SevenSeriesStandApart{Light,Dark}` (`behaviour/bar-chart.stories.tsx`): seven legend dots and seven stacked parts, seven distinct computed fills (before: the seventh repeated the first, six distinct). ui-core `verify` 34 of 34 and its tests 164 of 164; the chart stories pass in Chromium.
Native unrendered: the phone's BarChart takes the same cycle; its box stays open.
