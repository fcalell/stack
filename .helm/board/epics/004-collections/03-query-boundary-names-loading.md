---
id: 004-03
status: done
sessions: {}
---
# react-ui, native-ui: a QueryBoundary names its body's loading form, and the guide teaches collections taking data

## Goal
A `QueryBoundary` with no `loading` guesses its body's shape: a `List`'s two-line avatar rows
outside a `Section`, a `Group`'s rows inside one. The guess is 004-02's defect one level up. Once
collections draw their own states (004-02), a `QueryBoundary` wraps only a compound body, and
only that body's author knows its loading form.

## Approach
- `loading` is required on both platforms and the guessed default goes. The `Section` busy
  wiring stays.
- `packages/ui-core/guide/screen.md`: step 4's example is a `List` taking its query and row map;
  step 5 says a collection takes its query, and a `QueryBoundary` wraps a compound body and names
  its loading form.
- `plugins/expo/guide/routes.md` passes `loading`; the showcase's `QueryBoundary` call sites
  (`usage`, `assistant`, `members`) name theirs, or take their query on a collection.
- Built in 004-02's change, since the guide's example uses its API; both close together.

## Acceptance criteria
- [ ] (test) a `QueryBoundary` without `loading` fails the type check, both platforms.
- [ ] (file) no guide page or showcase frame has a `QueryBoundary` without `loading`.
- [ ] (file) `screen.md` steps 4 and 5 show a collection taking its query and a `QueryBoundary` naming its loading form.
