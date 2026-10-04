---
id: 003-40
status: backlog
sessions: {}
---
# native-ui: the phone critique's component defects

## Goal
The first phone critique (002-07, `apps/phone` Notes and Home, 390 and 320 dp, light and dark)
found, in stack's components:
- a waiting row's meta bar starts 7.9 dp right of the loaded meta text (`list-row/wait.tsx`: the
  meta line's `gap-x-inside` stands between a strut and the bar);
- two stacked hairlines under the menu sheet's head (`MENU_GROUP` draws `border-t` when it is
  the only group, under `SHEET_HEAD`'s hairline);
- the text input's hit area is 21.6 dp inside a 47 dp drawn field, so half the box doesn't focus;
- the menu sheet's heading reuses the more act's spoken label ("More Call the dentist…");
- a Section's count reads "0" beside the empty state that says the same;
- an empty 44 dp top bar above a Place's title when it has no back, switcher or acts;
- a `confirm()` offers both a Close act and Cancel.

## Approach
Decided by fcalell (2026-10-04), as recommended:
- the waiting meta bar starts at the loaded text's start;
- a menu group draws a divider only between groups;
- the input's hit area is the drawn field;
- the menu sheet's heading is the item's name;
- a Section draws no count when its collection is empty;
- a Place draws no top bar with nothing in it;
- a decision dismisses by Cancel alone.
Each one is checked for the same defect on the web, and the fix keeps both platforms the same.

## Acceptance criteria
- [ ] (live) on the harness, each finding measures fixed at 390 and 320 dp, light and dark.

## Progress
WIP on branch `wip/003-40-critique-defects` (commit aa187d6), stopped mid-work: code for the defects on both platforms, not checked, not verified live. Review the diff against the Approach before continuing.
