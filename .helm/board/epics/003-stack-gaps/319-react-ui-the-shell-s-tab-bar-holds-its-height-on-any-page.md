---
id: 003-319
status: review
sessions: {}
---
# react-ui: the Shell's tab bar holds its height on any page

## Goal
Stead's design critique of 2026-10-11 (github.com/fcalell/stead, `packages/server/test/review/findings-2026-10-11.md`, c1, a BLOCKER) found the touch Shell's tab bar shrinking to 17 px on a long page at 390x844 (22 px on /chats, 27 on item pages; natural 53, the tabs 96x48): the labels and glyphs are cut by the bar's own clip, so the primary navigation is half gone on any page whose content is longer than the viewport.

## Approach
The bar is a flex item of the Shell's column with the default `flex-shrink: 1`, and `SHELL_TAB_BAR` clips (`overflow-hidden`, for the count badges), which lets the item shrink below its content. When the page inside asks for more than the column has, the column's overflow is shared between `main` and the bar by their sizes. The bar takes `shrink-0` at the Shell (`TABS`), so the page is the only part that gives.

## Acceptance criteria
- [x] On touch, on a page whose body is several screens long, the tab bar is its natural height (the tabs' height plus the top padding and the hairline) and the tabs keep their 48 px.
- [x] The existing "body ends above the tab bar" story holds.
- [ ] Native the same.

## Built
Web: `plugins/react-ui/src/ui/components/shell/index.tsx`, `TABS` gains `shrink-0` with a comment on why. Story `TabBarHoldsItsHeight` (`apps/showcase/behaviour/shell.stories.tsx`, touch, 375 x 812, a form of 160 fields): the bar is at least its natural height (tab height + top padding + hairline, 57 px on touch) and the tabs 48. Before the fix the bar measured 11.3 px in that story; after, 57 px or more. Shell stories 13 of 13 in Chromium.
Native unrendered: React Native items do not shrink by default, so the phone's tab bar is believed unaffected, unchecked on a device; the native box stays open.
