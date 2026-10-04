---
sessions: {}
---
# Collections take data

## Goal
Every component that repeats one item shape over a collection takes data (`query` or `items`,
plus a per-slot item map) and draws all four of its states at the leaf: pending in its own
skeleton, failed, empty and loaded. Composition containers (`Section`, `Columns`, `Split`,
`Screen`, `Toolbar`, `Form`, `Sheet`, `Shell`) keep children.

## Breakdown rationale
`List` sets the pattern in 02. The audit (01) classifies the rest of the roster against the
rule and files one story per collection. 03, built in 02's change, narrows `QueryBoundary` to
compound bodies that name their loading form, and the guide teaches the pattern. Evidence: `.helm/research/skeleton-loading.md`.
