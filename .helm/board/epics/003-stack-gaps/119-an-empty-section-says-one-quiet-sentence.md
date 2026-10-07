---
id: 003-119
status: backlog
sessions: {}
---
# react-ui: an empty Section says one quiet sentence, not a framed box

## Goal
Stead's Now with nothing waiting draws "Nothing needs you." in a hairline box about 110 px tall in the Needs you Section (github.com/fcalell/stead, `packages/server/src/app/routes/_now/-components/now-list.tsx`; design/07-interface.md "Now", Empty: one sentence and no illustration). The app passes a bare `sentence` to `EmptyState` and has no way to ask for the quiet form. Evidence: Now critique unit u2, shot `empty-390-dark` (Stead scratchpad `critique/u2/shots/`, stack at `5564217`). Anchor: Linear Mobile's quiet empty list, https://mobbin.com/screens/6d7c142a-2783-4972-926a-658b4c04f3a1.

## Approach
`EmptyStateBase` (plugins/react-ui/src/ui/components/empty-state/base.tsx) decides its form by where it stands: inside a Section (`SectionContext`) it always draws the framed form (`EMPTY_FRAME` with its column, mark and centred text), inside a Group the card form. Neither has a form with the sentence alone at meta and no frame, so a Section that is empty for good news (nothing needs you) reads as a missing thing. Not 003-62 (a page's empty-state act that creates nothing). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A Section's empty state can stand as one muted sentence at the Section's text edge, with no frame, mark or act, at the same height on desktop and touch.
- [ ] The EmptyState showcase holds that form in a Section beside the framed one, and the critique judges both.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the quiet form is a prop, or the form a sentence with no title, mark or act takes inside a Section.
