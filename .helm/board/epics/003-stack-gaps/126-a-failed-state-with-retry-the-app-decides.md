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
- [x] An app can draw a failed state with a sentence and a Retry that runs a function, in the failed form (the alert mark, the hairline act, no plus), without a query.
- [x] `EmptyState`'s create act is unchanged.
- [ ] The EmptyState showcase holds the failed form beside the create form and the critique judges both.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether the failed form is a public part, `QueryBoundary` takes a mutation's result, or `Missing` takes an `Act`.

## Decided while building (2026-10-07), by the building session

Shape: a public roster part, `Failed` (shared, on both platforms), with `sentence` and an `act`; of the three the open question names, neither `QueryBoundary` taking a mutation's result nor `Missing` taking an `Act`.

- `Failed` is the EmptyState's failed form, drawn through `EmptyStateBase` with `tone="failed"`: the alert mark in the danger ink, the sentence at meta and the act as the hairline one with no plus, in the EmptyState's frames, so it draws the EmptyState's cells less the create act and the title role. `act` is an `Act` that runs a function (`{ label, onAct }`), never a link: a way back that creates nothing stays `Missing`, and a read of a query stays `QueryBoundary`, which now draws `Failed` itself for a failed query.
- `EmptyStateBase` drew the filled create act on the page form whatever its tone; it now picks the hairline act when the tone is not `rest` (`framed || props.tone !== "rest"`), so a failed page form no longer draws the create act. The `rest` tone, `EmptyState`'s only one, is unchanged.
- Contract: `Failed` in the shared roster with `props: ["sentence", "act"]`, `states: ["rest"]` and no `BUTTON.act.primary` among its cells; `QueryBoundary`'s comment names it.
- Showcase: the `EmptyState` frame draws the create form over the failed form, each alone on a page, and a `Failed` frame draws the page, Section, Group and body forms on the cells they own.
- Proof: `packages/ui-core/test/failed.test.ts` (the roster part on both platforms, the cells it draws and not the create act, `EmptyState` still drawing it) and the behaviour story `apps/showcase/behaviour/failed.stories.tsx` (Retry runs the function each press and draws no plus beside the alert mark; the `EmptyState` beside it keeps its plus). The story was not run in a browser by the building session.
- Not proven: the third criterion. The showcase holds the failed form beside the create form, but a render judged by the critique has not been run, and a design critique is run by a session that played no part in the work. The status stays `backlog` until it is.
