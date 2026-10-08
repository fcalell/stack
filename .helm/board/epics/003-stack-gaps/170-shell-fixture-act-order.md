---
id: 003-170
status: done
sessions: {}
---
# showcase: the Behaviour/Shell fixture orders its acts with the filled act last

## Goal
The `Behaviour/Shell` fixture passes acts `[Save, Discard]`, so `Discard` draws as the filled act (`ActionBar` fills the last act). The page's save act reads as the secondary one (scratchpad `critique/shell/report.md`).

## Approach
The fixture lists `[Discard, Save]`, and `BodyEndsAboveTheTabBar` measures `Save`, the last act.

## Acceptance criteria
- [x] The fixture's filled act is `Save`.
- [x] `BodyEndsAboveTheTabBar` asserts the last act stands above the tab bar.

## Built
`apps/showcase/behaviour/shell.stories.tsx`: the acts are `[Discard, Save]` and the play reads `Save`. Evidence: the `Behaviour/Shell` stories pass in the browser run.

## Critique (second round)
Ship, by a fresh critic at 320, 390, 768, 1280 and 1440, light and dark (scratchpad `critique/r2-layout/report.md`).
