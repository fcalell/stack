---
id: 003-124
status: backlog
sessions: {}
---
# react-ui: a Split's list standing alone keeps its bottom room over a docked foot

## Goal
Stead's Now is a `Place` with a `foot` (the ask field, docked) holding a `Split` whose list ends in the ask box's exchange (github.com/fcalell/stead, `packages/server/src/app/routes/_now/`, `ui/ask-box.tsx`; design/07-interface.md "Now"). Below `tablet` the list stands alone and its last reply sits flush on the docked field on touch, with no room between. Evidence: Now critique (Stead scratchpad `critique/`, stack at `5564217`).

## Approach
`LIST_ALONE` (plugins/react-ui/src/ui/components/split/index.tsx: `"page-max-tablet:w-full page-max-tablet:pb-0 page-max-tablet:border-r-0"`) sets the list's bottom padding to zero below `tablet`, overriding `SPLIT_LIST`'s `pb-inside` (ui-core/src/variants.ts). The padding over a docked foot exists only for a non-bleed Place body (`PAGE_BODY_OVER_FOOT`, `pb-sections`) and for `THREAD_LOG`; a Split under a `Place` with `foot` has neither, and its list is the scroller, so the room the foot needs falls to no one. The app cannot add it: geometry classes go on host elements only. Not 003-52 (the foot itself, built); not 003-94 (the list's top and wash). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A Split under a Place with a `foot`, standing as the list alone, ends its content a sections gap above the foot, at both densities.
- [ ] A Split under a Place with no `foot` is unchanged.
- [ ] The Split showcase holds a Place with a foot and the critique measures the gap at the phone's width.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether `LIST_ALONE` keeps `pb-inside`, or the list takes `PAGE_BODY_OVER_FOOT` when the Place has a foot.
