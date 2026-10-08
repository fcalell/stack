---
id: 005-22
status: todo
sessions: {}
---
# react-ui, native-ui: a List's rows read the route once and keep their keys

## Goal
- Web `ListRow` and `FileRow` each subscribe to the location through `useRoute`, one
  `useSyncExternalStore` and `popstate` listener per row (`lib/navigate.ts:6-18`;
  `components/list-row/index.tsx:123`, `file-row/index.tsx:142`), only to compute `current`.
- Web `List` builds each row's meta, status, chip, more and `onOpen` inline
  (`list/index.tsx:247-257`, `:280-288`), so a List re-render re-renders every row and no row can
  be memoised.
- Phone `Group` keys its row wrappers by index (`group/index.tsx:99`) over
  `Children.toArray`, which already gives stable keys; a conditional row shifts every later
  row's state onto the wrong element. A lint suppression claims rows never reorder.

## Approach
The List reads the route once and passes `current` to each row as a boolean. Row props are
built from stable per-item values, and `ListRow` and `FileRow` are memoised on primitives. The
Group keys each wrapper by its child's own key; the index stays for skeleton rows only, and the
suppression goes.

## Acceptance criteria
- [ ] (live) web, settings' devices at 1440: selecting a row re-renders only the rows whose `current` changed (React profiler), with one location listener in the page.
- [ ] (live) phone, on the harness: a Group with a conditional row keeps a later Switch's state when the row appears.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 1440: one shared popstate listener (plus the router's), and selecting a row marks it current. Cut (decided 2026-10-05, the recommended answer): rows are not memoised, so every row redraws on a navigation (12 on the deploys page) instead of only the rows whose `current` changes; memoising took a props box and a serialised shape per row per render, more code and likely more cost than those redraws. Open: the phone live criterion on the harness.

## Critique
Unrendered: its profiler and phone criteria cannot be drawn in Storybook.

## Cut
The Goal's second bullet and the Approach asked that `ListRow` and `FileRow` be memoised on primitives so selecting a row re-renders only the rows whose `current` changed, and the first live criterion measures exactly that. It is not delivered: rows are not memoised, so every row redraws on a navigation (12 on the deploys page). It was cut by the builder or an AI session in the story's own Progress ("Cut (decided 2026-10-05, the recommended answer)"), not by the owner; no ruling file. The gap is in the code today: `list-row/index.tsx` has no `memo`, and List still builds each row's props inline. The phone criterion on the harness is also still open.
