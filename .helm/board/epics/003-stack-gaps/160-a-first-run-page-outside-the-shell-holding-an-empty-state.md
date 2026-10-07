---
id: 003-160
status: backlog
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
- [ ] Stack provides a part for the first-run page: one `EmptyState` centred across and down the viewport on the canvas ground, an act and a secondary act, one `h1` (the EmptyState's title), on web and phone.
- [ ] It is a root frame like `Gate` and `Shell`, so `toast()` and `confirm()` stand in it, and the rules name it beside `Gate` for a page outside the shell.
- [ ] The showcase restores `/welcome` on it, with no host element carrying a look.

## Open questions
- [ ] Its shape (a component, a variant of `Gate`, a token, an option): the stack session decides.
