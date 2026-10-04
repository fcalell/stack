---
id: 003-29
status: backlog
sessions: {}
---
# ui-core: a meter row carries linked counts

## Goal
Martechthings shows test status per environment as passing over applicable, with failing and untested as counts that lead to their lists. `Meter` takes `meta` as a string and has no link.

## Approach
- Reference: Vanta's OK block, a meter with "31 OK … 108 total" under it ([screen](https://mobbin.com/screens/adef9517-51fe-4466-9ca1-6b40fdeace81)).

## Acceptance criteria
- [ ] A meter's meta line carries counts that are links.
