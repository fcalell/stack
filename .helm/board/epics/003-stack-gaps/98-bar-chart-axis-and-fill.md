---
id: 003-98
status: backlog
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
- [ ] A bar's fill reads as data, not a chip, in light and dark.

## Built
Ticks: the axis band is `relative` and each tick is `absolute` on the band's top edge, centred by `-translate-y-1/2`; the last band's bottom is the baseline and carries the 0 (`translate-y-1/2`). The old band stretched its label to the band's height, so the centring offset was half a band. Both platforms; the loading form draws the same five tick bars. The top tick's half line is the room 003-148 gives the body.
Per-bar labels already exist: the `at` slot draws a time under each bar (the Open flags frame draws `R1` to `R3`); Stead's card passes none.
Evidence: `apps/showcase/behaviour/bar-chart.stories.tsx` measures each tick's centre against its gridline's top edge and the 0 against the baseline (within 1.5 px, desktop and touch runs); both pass.

## Open
The fill criterion needs a palette decision the rulings do not settle, so `CHART_FILL` still reads `bg-chip-<hue>` (the chip marks). Question for the owner: should a bar's fill be a quieter dedicated `chart-<hue>` colour family? Recommended answer: yes, six colours in `CHART_SERIES` order at about 60% of the chip mark's chroma, lightness set so each holds 3:1 against `surface` and `group` in light and dark (`ui-core verify` gates it), with `CHART_FILL` and the legend dots reading them; the chip marks stay the chips'.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
