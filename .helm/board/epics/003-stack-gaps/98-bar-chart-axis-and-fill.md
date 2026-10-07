---
id: 003-98
status: review
sessions: {}
---
# react-ui: a bar chart's axis lines up with its gridlines and carries zero, x labels and a quieter fill

## Goal
Stead's card Trend chart (`routes/work/-components/card.tsx`; `stalled-375-light`, `stalled-1440-light`): tick labels (3.2, 2.4, 1.6, 0.8) sit ~8 px above their gridlines at 1440, the baseline has no 0 tick, the bars have no x labels (which round), and the fill is one flat saturated teal block per bar.

## Approach
bar-chart/index.tsx draws each axis label inside its band with `TICK` (`-translate-y-1/2`) while each band carries its own rule, so the label centres on the band's edge only if the band's rule is at its edge; the axis draws `BANDS` labels, none for the base line. `CHART_FILL` is `bg-chip-teal`, a chip mark. Story 80 covers integer steps and the level head, not these.

## Acceptance criteria
- [x] Each tick label centres on its gridline.
- [x] The baseline carries its 0 tick.
- [x] A chart takes per-bar labels under the plot (a round, a day).
- [x] A bar's fill reads as data, not a chip, in light and dark.

## Built
Ticks: the axis band is `relative` and each tick is `absolute` on the band's top edge, centred by `-translate-y-1/2`; the last band's bottom is the baseline and carries the 0 (`translate-y-1/2`). The old band stretched its label to the band's height, so the centring offset was half a band. Both platforms; the loading form draws the same five tick bars. The top tick's half line is the room 003-148 gives the body.
Per-bar labels already exist: the `at` slot draws a time under each bar (the Open flags frame draws `R1` to `R3`); Stead's card passes none.
Evidence: `apps/showcase/behaviour/bar-chart.stories.tsx` measures each tick's centre against its gridline's top edge and the 0 against the baseline (within 1.5 px, desktop and touch runs); both pass.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built (fill)
No existing step of a hue is both quieter and holds 3:1 on `surface` and `group` in both modes: `chip-<hue>` is the loud mark, `-soft` is under 1.5:1, and `-ink` is darker (light) or lighter (dark) than the mark, not quieter. So `chart-<hue>` is a new six-colour family (`COLOR_GROUPS.chart`): each is its chip hue at about 60 % of the mark's chroma, at the lightness nearest the mark's that holds 3:1 on `surface` and `group` (light L 0.61 to 0.63, dark L 0.53 to 0.555). `CHART_FILL` reads `bg-chart-<hue>` for bars, stacked parts and the legend dots; the chip marks stay the chips'. `ui-core verify` measures each `chart-<hue>` at 3:1 on both grounds in both modes, and BarChart owns the `chart-` family.
Evidence: `ui-core verify` 34/34 and both plugin verifies pass; `content/BarChart` Rest, Loading, Error, Empty and `behaviour/bar-chart` pass in the browser run.
Owner render: `content/BarChart` Rest (single series teal, stacked violet, amber, pink, green, red), light and dark.
