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
- [ ] (live) web, members at 1440: moving the pointer across editable cells re-renders at most the two cells it left and entered (React profiler); at 375 only the list form is in the document.
- [ ] (live) phone, on the harness: a row tap re-renders only that row.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 1440: a pointer move re-renders 1 to 3 cells and no row (master: all 30 cells and 5 rows), a key move 2 cells. Not met: at 375 both forms still mount; the CSS form switch stays with a `// TODO:` until the page width is known before paint (the story's allowed fallback). Open: the phone live criterion on the harness.
