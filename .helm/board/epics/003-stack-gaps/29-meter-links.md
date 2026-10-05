---
id: 003-29
status: review
sessions: {}
---
# ui-core: a meter row carries linked counts

## Goal
Martechthings shows test status per environment as passing over applicable, with failing and untested as counts that lead to their lists. `Meter` takes `meta` as a string and has no link.

## Approach
- Reference: Vanta's OK block, a meter with "31 OK … 108 total" under it ([screen](https://mobbin.com/screens/adef9517-51fe-4466-9ca1-6b40fdeace81)).

## Acceptance criteria
- [ ] A meter's meta line carries counts that are links.

## Shape
`Meter.counts?: readonly CountLink[]` (the descriptor shared with 003-27), exclusive with `meta`: the meta line draws the counts as `Link`s at meta in tabular figures, separated by the `inside` gap only. 004-09's `List` meter map gains a `counts` slot.
