---
id: 003-11
status: done
sessions: {}
---
# ui-core: rows stand at a depth on a rail and fold under their parent

## Goal
Martechthings draws a branching journey as a step list: a choice point's options head legs indented under it, nested choice points step in again, and expectations sit under each step. `ListRow` has no depth or rail, and `OptionList` indents only a checked option's children.

## Approach
- References: LangChain's trace tree, ≈ 19 px per level with a hairline rail per level and a fold chevron per parent ([screen](https://mobbin.com/screens/8ff4a744-6e6e-46ef-a671-90ff0201b0dc)); Attio's If / else panel, option chips with the next step indented on a connector ([screen](https://mobbin.com/screens/440a5600-7725-417e-a6c2-6913adce5f8a)); Postman's run results, checks nested under each step on a rail ([screen](https://mobbin.com/screens/f009c86c-c5df-4f73-9ea6-c3b14cd0e3b4)).

## Acceptance criteria
- [ ] Rows draw at a depth with a hairline rail per level, and a parent folds its children.
- [ ] Three levels leave a row's title readable in a Split main beside the list.

## Open questions
- [x] A `ListRow` depth or a tree component: the stack session decides.

## Shape
`RowSlots<T>.children?: (item: T) => readonly T[] | undefined` makes a `List` a tree: each level one `indent` step in (a new size, 16 desktop / 20 touch), a hairline rail per level, and a fold chevron (`ChevronRight`/`ChevronDown` at `icon-meta`) in a lane every row of the tree reserves. The List owns the fold state (open by default) and passes depth to `ListRow` through internal context, so `ListRow`'s roster props do not change. Web: `role="tree"`/`treeitem` with `aria-level`/`aria-expanded` and Arrow Left/Right; phone: `accessibilityState.expanded`. The flattening by fold state lives in `list-state.ts`, pure and tested.

Review (accepted by fcalell): the fold chevron draws at `icon-control`, the size `IconButton` draws its glyph at; the shape's `icon-meta` is amended.

Review (decided by fcalell after critique 1): the web tree is a real tree, the WAI-ARIA tree pattern. The List is `role="tree"`, each row a `treeitem` (`aria-level`, and `aria-expanded` on a branch) and the tree holds one tab stop (roving): Up and Down move between visible rows, Right opens a closed branch or moves to the first child, Left folds an open branch or moves to the parent, Home and End go to the first and last, Enter opens the row. The fold act is for the pointer, out of the tab order. The navigation (`treeMove`, `treeStop`, `folding`) is pure and tested in `list-state.ts`. A waiting tree draws its rails at the depths 0, 1, 2, 2 (`waitingDepth`), so its rows start their text about where a loaded tree's do. The phone keeps `accessibilityState.expanded` on the fold act.
