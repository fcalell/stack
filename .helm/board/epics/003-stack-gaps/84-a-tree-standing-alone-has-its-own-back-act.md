---
id: 003-84
status: review
sessions: {}
---
# ui-core: a list standing alone at a deeper route draws its own back act

## Goal
Stead's System shows a repo's knowledge tree as the list at `/system/repos/<repo>/knowledge`, with a page in the main (`design/07-interface.md`, "The knowledge editor"; github.com/fcalell/stead). The phone sketch draws the tree alone with its own back act, "‹ Knowledge", to the repo, one level above the tree. Stack draws no back act on a list standing alone: a Place draws one only with a record open.

## Approach
`Split.back` (story 68) is the route an open record returns to, the list's own route. The tree's back act needs a second route, the list's parent, which neither the Split nor the router can derive: the tree and the page share one layout component. Story 68 left it out of scope.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides. A second route on `Split`, or a back act on the Place that a list standing alone also draws.

## Ruled
No new surface. A list standing alone at a deeper route is a pushed `Screen` whose `back` is the route above it, holding `<Split back={treeRoute}>`: the Screen's back act leads up while the list stands alone, and `LIST_BACK_REPLACED` swaps in the Split's `back` once a record is open. Both rules pages and `ui-core.md` say so; native reads the same through `Screen`'s `exit`.
Evidence: `behaviour/split.stories.tsx` `TreeAloneGoesUp` and `TreeRecordGoesToTree` (desktop and `Touch`: the one visible Back act leads to the parent, then to the tree).

## Critique
Rework: the tree-alone Split (desktop and Touch stories) overflows the viewport by 71 px at 320 and 1 px at 390; its page head and containers end at x 391 at every width. The back act renders.

## Rework
The overflow is the stories' own harness: `Page` is a fixed 375 px, which with Storybook's 16 px padding ends at x 391 at every viewport. The `Tree` stories stand in `Page width={375} fluid` (never wider than the screen), and `TreeAloneGoesUp` asserts the document does not scroll sideways. The Screen and Split hold no overflow of their own.
Evidence: `behaviour/split.stories.tsx` `TreeAloneGoesUp`, `TreeAloneGoesUpTouch`, `TreeRecordGoesToTree` pass.
