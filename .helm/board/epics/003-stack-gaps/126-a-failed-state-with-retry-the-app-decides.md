---
id: 003-126
status: backlog
sessions: {}
---
# react-ui: a failed state the app decides draws Retry as the hairline act, not the create act

## Goal
Stead's review file screen shows "Could not load the file." with Retry when its open-file mutation fails, and the Retry draws as the filled primary act with a plus glyph, so a way to try again reads as "create" (github.com/fcalell/stead, `packages/server/src/app/routes/_now/-components/file-screen.tsx`, `Shown`; design/07-interface.md "A failed read"). Evidence: item screens critique unit u4, shots `e-ferr-390-light` and `e-ferr-1280-light` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

## Approach
The file is read by a mutation (`mutate({ id, path })`), not a query, so `QueryBoundary` (which draws a failed read as the hairline Retry with no plus: `tone="failed"` in empty-state/base.tsx) does not stand for it, and the app composes the public `EmptyState`, whose page form draws every act as the filled create act with `Plus` (`create = props.tone === "rest"`). 003-62 added `Missing` for a way back that creates nothing; it takes a `LinkAct`, never a function act, and its Shape keeps `EmptyState`'s act the create act, so it does not cover a Retry. `tone` stays internal (`EmptyStateBase`), so the app cannot ask for the failed form. Wrapping the mutation as a fake query to reach `QueryBoundary` would be a workaround. Seen at stack `5564217`.

## Acceptance criteria
- [ ] An app can draw a failed state with a sentence and a Retry that runs a function, in the failed form (the alert mark, the hairline act, no plus), without a query.
- [ ] `EmptyState`'s create act is unchanged.
- [ ] The EmptyState showcase holds the failed form beside the create form and the critique judges both.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the failed form is a public part, `QueryBoundary` takes a mutation's result, or `Missing` takes an `Act`.
