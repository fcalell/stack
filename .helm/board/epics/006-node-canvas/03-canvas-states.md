---
id: 006-03
status: backlog
sessions: {}
---
# react-ui: the canvas draws off, a problem, a status and a run's taken path

## Goal
The states both consumers read on the canvas: Stead's off nodes, its problems from a save and a
run's marked node; Martechthings' test status and a scenario's taken path.

## Approach
- **Off**: muted ink, the `off` word in place of the line, its edges dimmed, never dashed.
- **Problem**: a danger border and the problem's first words as the node's line in danger ink.
  The consumer names the problems outside the canvas (Stead's `Banner` and `List`).
- **Status**: a dot and its label in the node's trailing slot, from the six states.
- **Path**: nodes and edges off `path` in disabled ink; on-path ones at full ink with their
  status; `at` outlined at the selection's weight in the active hue. Accent stays on selection
  and the path's marks.

## Acceptance criteria
- [ ] A story per state, and a run over the workflow and a scenario over the journey, at 375 and 1440 in both modes, pass `pnpm stories:test`.
- [ ] Every state reads in its node's spoken name, never by colour alone.
- [ ] The design critique judges the run against Twenty's and Attio's runs.
