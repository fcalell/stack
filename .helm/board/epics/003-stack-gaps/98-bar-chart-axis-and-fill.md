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
- [ ] Each tick label centres on its gridline.
- [ ] The baseline carries its 0 tick.
- [ ] A chart takes per-bar labels under the plot (a round, a day).
- [ ] A bar's fill reads as data, not a chip, in light and dark.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
