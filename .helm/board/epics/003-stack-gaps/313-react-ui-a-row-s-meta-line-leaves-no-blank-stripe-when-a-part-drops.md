---
id: 003-313
status: review
sessions: {}
---
# react-ui: a row's meta line leaves no blank stripe when a part drops

## Goal
At 440 px the long status form fits by dropping `· main` whole, leaving a blank stripe of about 32 px before the status dot.

Found by the critique of 003-208.

## Acceptance criteria
- [x] At 320, 390 and 440 in the 440 px list column no gap wider than the normal gap step stands where a dropped part was.
- [x] The status word is never clipped, as today.

## Ruled
The stripe is the room the dropped part's slot grew into (`grow w-0`), which CSS cannot give back once the part wraps away. The parts' box stops growing when the later parts are dropped whole, so the marks follow the first part a gap apart and the free room falls at the line's end. No new surface: the rule is internal to `ListRow`, no ui-core value changes (the gap and `figures` are the existing `gap-x-inside` and `basis-figures`). A row whose later parts show, or that has no mark, is unchanged (marks keep their place at the end). The phone's later parts never drop (they truncate with an ellipsis), so no native change.

## Built
- react-ui `lib/dropped.ts` (`useDropped`): reads the room the line leaves the later parts (line width less the first part, the marks and the gaps) against the slot's `figures`, before paint and on a `ResizeObserver` of the line, the first part and the marks. It reads geometry the slot does not move, so the answer never rests on the form drawn (no flip with the status's short form).
- `list-row/index.tsx`: while dropped the parts' box drops `grow` (`META_PARTS_DROPPED`) and the slot `grow-0` (`LATER_DROPPED`).
- `rules.md` and `ui-core.md` say it.
- Showcase `behaviour/list-row-status.stories.tsx` (`MetaDrops`, `MetaDropsTouch`): fourteen remotes of growing length at 440, 390 and 320; every row whose `main` wraps away has its status within a gap of the first part's text, the status word whole; at least one row drops per width. Fails without the fix (37 px against a 7 px gap), passes with it. Chromium: `list-row-status`, `row-meta`, `list`, `list-acts`, `waiting`, `place`, `split`, `split-record`, `sheet`, `thread-fill`, `option-list`, `picker`, `table-edit`, `code-copy`, `canvas*`, `segmented-control` all pass.
Native unaffected: its later parts truncate, no slot wraps away. The Stead 440 px critique view is unrendered by the critique yet.
