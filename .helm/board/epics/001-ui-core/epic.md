---
id: 001
title: ui-core
prd: docs/prd/ui-core.md
---
# ui-core, one design system rendered per platform

The driver is [`docs/prd/ui-core.md`](../../../../docs/prd/ui-core.md). This epic is its seven
milestones as stories; the PRD stays the source of scope, decisions, and acceptance, and each story
holds the implementation brief for one milestone.

Stack has no test runner, so no criterion here carries a `(test)` tag. The available modes are
`(command)` (`pnpm check`, a build, a generate run), `(file)` (read a named file), and `(live)` (a
human drives the app).

## Stories

| id     | milestone | title                                              |
| ------ | --------- | -------------------------------------------------- |
| 001-01 | M1        | ui-core package: token contract, derivation, laws  |
| 001-02 | M2        | shared cn, the first variant matrices, the canon   |
| 001-03 | M3        | plugin-solid-ui adoption                           |
| 001-04 | M4        | plugin-native-ui adoption                          |
| 001-05 | M5        | the canon sweep, both plugins                      |
| 001-06 | M6        | the geometry gate                                  |
| 001-07 | M7        | remaining matrices (follow-up, out of acceptance)  |
