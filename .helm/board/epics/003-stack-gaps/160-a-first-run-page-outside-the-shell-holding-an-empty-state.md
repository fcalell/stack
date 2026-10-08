---
id: 003-160
status: done
sessions: {}
---
# ui-core: a first-run page outside the shell holding only an EmptyState

## Goal
A first-run page (no sidebar or tab bar, no workspace yet) whose whole body is one `EmptyState`: its title the page's one `h1`, its sentence, its act, and a secondary act under it. The showcase's `/welcome` was this page ("Deploy your first app", "Connect a repository", "Start from a template") and was dropped from `apps/showcase` because the contract has no part for it.

## Approach
A page outside the shell is a `Gate` (rules.md), and nothing else fits:
- `Gate` requires `title`, which is its `h1` over a lead and a body. Wrapping an `EmptyState` in it draws two titles (the Gate's and the EmptyState's) over a card-width column, where the page is one centred empty state.
- `Place`, `Screen` and `Shell` are the shell's frames and draw its chrome.
- `EmptyState` on its own draws no page ground and no centring down the viewport, so it needs a host that fills the viewport on the canvas ground. The dropped route did that with `<main className="flex flex-col items-center justify-center p-sections bg-canvas min-h-dvh">`, which breaks rules.md's "classes are geometry" (`bg-canvas` is a fill, `min-h-dvh` a numeric dimension) and its "a page outside the shell is a `Gate`".

## Acceptance criteria
- [x] Stack provides a part for the first-run page: one `EmptyState` centred across and down the viewport on the Gate's ground (`surface`; see Ruled), an act and a secondary act, one `h1` (the EmptyState's title), on web and phone.
- [x] It is a root frame like `Gate` and `Shell`, so `toast()` and `confirm()` stand in it, and the rules name it beside `Gate` for a page outside the shell.
- [x] The showcase restores `/welcome` on it, with no host element carrying a look.

## Open questions
- [x] Its shape (a component, a variant of `Gate`, a token, an option): an untitled `Gate` (see Ruled).

## Ruled
The first run is a `Gate` with no `title`: it draws no lead and provides no `PageTitle`, so its one `EmptyState` takes its first-run form, the page's `h1` with the acts stacked across the column. No new component and no EmptyState prop. The ground stays the Gate's `surface`, not canvas: every page outside the shell sits on one ground, and the canvas wording came from the dropped route's `bg-canvas` class, so the acceptance criterion reads "the Gate's ground". `mark`, `step` and `description` come only with a `title` (a discriminated union on the props type). On touch a typed step stays at the top for the keyboard; an untitled Gate stays centred down, on the phone too.

## Built
- `plugins/react-ui/src/ui/components/gate/index.tsx` and `plugins/native-ui/src/ui/components/gate/index.tsx`: `GateProps` is `GateBase & (titled | untitled)`; no title draws no lead and passes `PageTitle` undefined. Web centres an untitled column with `my-auto` alone (`touch:my-0` only with a title); native adds `justify-center` to the scroll's content container.
- Both `empty-state/base.tsx`: the first-run column is `self-center`, so it stands centred in the Gate's `auth` column (found by the behaviour story: the column stood at its start edge).
- Gate and EmptyState JSDoc, the roster Gate comment, both `rules.md` ("A page outside the shell is a `Gate`" gains the first-run paragraph and example), both `gate.test.ts` (the union).
- `plugins/react-ui/src/ui/showcase/frames/empty-state.tsx`: the first-run frame draws `Gate` in place of the hand-built `bg-canvas` host.
- `apps/showcase/src/app/routes/welcome.tsx`: `/welcome` restored as a `Gate` holding the `EmptyState`, no host element and no class.
- `DESIGN.md` regenerated: no change (it carries no Gate prose).

Evidence: `apps/showcase/behaviour/gate.stories.tsx` `FirstRunCentred` (1440) and `FirstRunCentredOnTouch` (390, touch density) assert exactly one `h1` (the EmptyState's) and the column centred across and down within 1 px; they pass with the Gate, EmptyState and Failed stories and the Failed and not-found behaviour stories; `pnpm --filter showcase test-screens` passes (17 files, 170 tests, `/welcome` among them); `pnpm check` and the three `verify` runs pass.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/shell/report.md`).
