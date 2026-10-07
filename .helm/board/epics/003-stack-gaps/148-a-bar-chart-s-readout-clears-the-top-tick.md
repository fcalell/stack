---
id: 003-148
status: backlog
sessions: {}
---
# react-ui: a bar chart's readout keeps clear of its top tick at touch

## Goal
Stead's brief loop chart (`routes/work/-components/card.tsx`, a `BarChart` with `level`; design/07-interface.md "A card", the brief loop). At 390 the head's readout ("1 flag") and the top tick label ("3") sit about 4 css px apart (readout baseline y 1335, tick y 1367 at 2x), so the readout reads as a stray figure on the axis; at 1440 the two stand 11 px apart. Evidence: card critique unit u7, shot `refining-390-light` (Stead scratchpad `critique/u7/shots/w/`, Stead `c9c9e5a`, stack `5564217`).

## Approach
`bar-chart/index.tsx` draws the head (`CHART_HEAD`, `gap-pair`) directly over the body, and the top tick label is `TICK` (`-translate-y-1/2`) centred on the first band's top rule, so half its line stands above the plot into the head's gap; the gap is one pair step at both densities while the touch meta line is taller. 003-98 covers tick centring, the zero tick and x labels, and 003-80 the level head; neither sets the head-to-plot clearance. Related: the head names no round, so the readout carries no bar it belongs to (003-98's per-bar labels would name it).

## Acceptance criteria
- [ ] The head's last line and the top tick label keep at least the desktop clearance (11 px) at touch density.
- [ ] The Bar chart showcase measures the head-to-tick distance at 390 and 1440.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
