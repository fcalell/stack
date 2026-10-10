---
id: 005-20
status: review
sessions: {}
---
# react-ui, native-ui: a Table re-renders only the rows and cells that changed

## Goal
- Web `Grid` holds `hover` (`components/table/index.tsx:387`, set on pointer enter and leave at
  `:557-559`) and `cursor` (`:376`, a fresh object on every focus at `:442-445`) in its own
  state, and builds every row inline: each pointer move across editable cells re-renders rows x
  columns.
- Web renders both forms always, `Grid` (`:324`) and the phone-width `ListRow` list
  (`:340-348`), and hides one with CSS (`GRID` and `LIST_FORM`, `:72-73`): every sort, selection
  or data change renders and diffs the rows twice, and the hidden copy stays in the document.
- Phone `Grid` holds a row's pressed look in its state (`table/index.tsx:316`, `:326-337`), so
  each touch down and up re-renders the whole grid; `HeadCell` keeps its own pressed state
  (`:540`, `:579-582`).

## Approach
Row and cell are memoised components fed per-cell primitives, so only the cells whose state
changed re-render; a focus on the same cell sets nothing. Hover and pressed looks come from CSS
and the Pressable's own pressed state (`active:`), as `ListRow` does, with no grid state. Only
the live form mounts, chosen from the page width through one external store; if switching must
stay in CSS, it stays with a `// TODO:` naming the 2x ceiling.

## Acceptance criteria
- [x] (live) web, members at 1440: moving the pointer across editable cells re-renders at most the two cells it left and entered (React profiler); at 375 only the list form is in the document.
- [ ] (live) phone, on the harness: a row tap re-renders only that row.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 1440: a pointer move re-renders 1 to 3 cells and no row (master: all 30 cells and 5 rows), a key move 2 cells. Open: the phone live criterion on the harness.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/data/report.md`).

## Cut
The Approach asked that only the live form mount (a Table at 375 holds only the list form), and the first live criterion states it. It is not delivered: both the Grid and the phone-width list mount and CSS hides one, so every sort, selection or data change renders and diffs the rows twice. The builder took the Approach's own fallback in the story's Progress ("the CSS form switch stays with a `// TODO:`"); the owner did not rule it. The gap is in the code today: `plugins/react-ui/src/ui/components/table/index.tsx` line 91 holds the `// TODO:` for the two mounted forms. The phone live criterion on the harness is also still open.

## Owner ruling
The owner rules build: the Table chooses its form from the page width through one external store, so only the live form mounts, and the `// TODO:` goes.

## Built
`lib/page.ts` holds `usePageTablet`: the Table's root finds its page (the `data-page` mark a Place and a Screen carry) in the layout phase, and a `useSyncExternalStore` over a ResizeObserver reads whether the page is `tablet` wide. The Table mounts the `Grid` or the phone list from it and nothing before the root is placed (the placing re-renders before paint); a Table outside a page draws the list. The CSS form switch (`GRID`, `LIST_FORM`, the `// TODO:`) is gone. The showcase's `Table` stories `FromTablet` (768) and `BelowTablet` (767) assert one form in the document. Live on the members screen: at 375 no grid is ever inserted; at 1440 the first frame holds the grid, and a pointer move re-renders 1 to 2 cells and no row, a key move 1 row and 2 cells; resizing 1440 to 375 and back swaps the form.

## Open
The phone live criterion on the harness (a row tap re-renders only that row) is not run; the owner's ruling covers the web form only. The story stays `todo` until it is.

## Review
Web accepted 2026-10-10 on the owner's ruling and the suite; waits on the native render (the phone box stays open). Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass.
