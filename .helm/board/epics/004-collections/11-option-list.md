---
id: 004-11
status: review
sessions: {}
---
# react-ui, native-ui: an OptionList's options from a query draw failed and empty

## Goal
An `OptionList` repeats one item shape, a check row, and already has a `loading` form for
options that wait. Options that load from a query (the scopes an integration grants, the
repositories to import) have no failed or empty form, and the app must project its records
into `Option`s first.

## Approach
OptionList takes `query` (with `sentence`) plus an `option` map over a check row's slots:
`value`, `label`, `description`, `recommended`, `group` (the group label it stands under), each
`(item) => …`. Static sets keep `options`, since an `Option` is already the projected row (the
showcase's permissions). `value`, `onChange` and the children under a chosen option are
unchanged.

- **Pending**: the check-row skeletons it draws today, a description bar only if `description`
  is declared.
- **Failed** (query form): the failed line with `sentence` and Retry inside the card, so the
  field keeps its place in the form.
- **Empty**: `empty`, a sentence in the card (nothing to grant).
- **Loaded**: the check rows, as today.

Web and phone take the same props. Needs a query for loaded option sets; static sets need only
`options`.

## Acceptance criteria
- [x] (test) both plugins' `OptionList` take `query` + `option` + `sentence` + `empty` beside `options`, and the roster entry lists the `error` and `empty` states.
- [x] (test) a pending OptionList whose `option` declares no `description` draws one-line skeleton rows.

## Progress
Built on web and phone; `pnpm check` and `pnpm verify` pass. The failed line is built from existing cells (a meta row and a secondary Retry), with no danger mark, for the design critique. No consumer loads options from a query yet. Open: the live check (web per batch, phone on the harness).
