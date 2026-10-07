---
id: 003-154
status: backlog
sessions: {}
---
# react-ui: a bar chart's readout can be a currency figure, not a spelled unit

## Goal
Stead's Usage screen charts spend: a `BarChart` with `unit={{ one: "dollar", other: "dollars" }}` (github.com/fcalell/stead, `usage.tsx:90,126,149`; design/07-interface.md "Usage"). System critique unit u8 (shot `usage-1440-light`): the section says "$30.97 spent." and the chart's readout reads "31 dollars" (Code by stage "12.4 dollars"), two figures for one total, a unit spelled beside a number the page writes as $30.97.

## Approach
`BarChart` draws `figure.format(total)` then `unitOf(unit, total)` (bar-chart/index.tsx 232 to 239): a word after a number formatted by `formatter(top)` for the tick scale, so money cannot read "$30.97" and its cents round to the axis step. Not 003-148 (readout clearance) or 003-98 (axis centring).

## Acceptance criteria
- [ ] A chart can take a currency (or a format) so its readout and spoken total read "$30.97" like the page's other money figures.
- [ ] The Bar chart showcase holds a spend chart in a currency at 390 and 1440.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
