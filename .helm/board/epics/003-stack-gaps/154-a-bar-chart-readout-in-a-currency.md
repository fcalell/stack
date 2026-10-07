---
id: 003-154
status: review
sessions: {}
---
# react-ui: a bar chart's readout can be a currency figure, not a spelled unit

## Goal
Stead's Usage screen charts spend: a `BarChart` with `unit={{ one: "dollar", other: "dollars" }}` (github.com/fcalell/stead, `usage.tsx:90,126,149`; design/07-interface.md "Usage"). System critique unit u8 (shot `usage-1440-light`): the section says "$30.97 spent." and the chart's readout reads "31 dollars" (Code by stage "12.4 dollars"), two figures for one total, a unit spelled beside a number the page writes as $30.97.

## Approach
`BarChart` draws `figure.format(total)` then `unitOf(unit, total)` (bar-chart/index.tsx 232 to 239): a word after a number formatted by `formatter(top)` for the tick scale, so money cannot read "$30.97" and its cents round to the axis step. Not 003-148 (readout clearance) or 003-98 (axis centring).

## Acceptance criteria
- [x] A chart can take a currency (or a format) so its readout and spoken total read "$30.97" like the page's other money figures.
- [x] The Bar chart showcase holds a spend chart in a currency at 390 and 1440.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided
No new prop: `ChartUnit` widens with `{ currency: "USD" }`. The chart has no spoken total any more (the hidden table and summary are gone), so the readout and the axis are what the criterion covers.

## Built
`ChartUnit` gains `{ currency }` and `./chart` gains `currencyOf`; `unitOf` returns nothing for a currency (`packages/ui-core/src/chart.ts`). Both BarCharts write the head's and the keys' figures through the currency formatter, exact ("$30.97"), and the axis whole when its step is whole ("$8"), compact from five figures; no word follows the figure. The phone prefixes the currency symbol to its `compact` figure past five figures (a TODO names the limit). The `Spend` section of the Bar chart frame (`CHART_BAND` at rest) holds a week of spend in dollars.
Evidence: `apps/showcase/behaviour/bar-chart.stories.tsx` reads "$40.22" and "$30.97" in the head and "$8", "$6", "$4", "$2", "$0" on the axis in the desktop and the touch run; both pass. `packages/ui-core/test/chart.test.ts` pins `currencyOf` and `unitOf`.
