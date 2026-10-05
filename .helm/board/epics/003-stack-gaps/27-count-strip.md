---
id: 003-27
status: review
sessions: {}
---
# ui-core: a count strip

## Goal
Martechthings' organization home opens on one strip of counts under the header: a label over a figure, an optional meta line ("last 90 days") and sub-counts, each cell a link to its list, cells split by hairlines, zeros shown. Composing it from `Columns` and `Text` needs classes the rules forbid.

## Approach
- References: Neon's project dashboard, one hairline card of four counts split by vertical rules ([screen](https://mobbin.com/screens/0cd7337d-2ecf-4211-bb02-95dbcb1bab11)); Braintrust's period eyebrow over its figures ([screen](https://mobbin.com/screens/ca9ccd87-f005-455d-b927-3c02fc77a90b)); Jobber's stage columns with sub-counts ([screen](https://mobbin.com/screens/882db7c6-4012-4459-ba02-1e93355fa689)).

## Acceptance criteria
- [ ] One row of cells at 1440, each a label, a figure at the body-strong size, an optional meta line and sub-counts, each a link.

## Shape
New molecule `Stats { items: readonly StatSpec[] }`, `StatSpec = { label: string; value: number; unit?: string; meta?: string } & ({ counts?: readonly CountLink[]; href?: never } | { href: Route; counts?: never })`, `CountLink = { label: string; value: number; href: Route }` (shared with 003-29). One hairline card split by dividers; each cell the label at meta, the figure at a new type role `figure` (ratio ≈ 1.69 of the body, 22 desktop / 27 touch, weight 500, tabular; the range measures strip figures at 18–26), the optional meta line, and the counts as `Link`s; zeros drawn. Two cells to a row below `tablet` and on the phone. Range: `patterns/stats.md`.
