---
id: 003-91
status: review
sessions: {}
---
# react-ui: a sheet's touch head keeps its title whole beside its submit

## Goal
Stead's New thread sheet at 375 px reads "New thread w…" beside its submit "Open the thread" (design/07-interface.md "Chats"; github.com/fcalell/stead, packages/server/src/app/routes/chats/-components/new-thread.tsx).

## Approach
The 343 px touch head row holds the back act (44), the title (132) and the bar-fit submit (151) with 8 px gaps; the title needs 183 px and truncates instead of wrapping. Seen at stack f6563f6.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Built

A sheet's title wraps to its whole text beside the acts at every density (`truncate` is gone from `plugins/react-ui/src/ui/components/sheet/base.tsx`; `numberOfLines` removed from `plugins/native-ui/src/ui/components/sheet/base.tsx`); the head row keeps its acts centred on the title block. Evidence: `behaviour/sheet.stories.tsx` `TouchHeadKeepsItsTitle` (375 px, touch) passes: the title wraps, none of it clipped, the submit beside it inside the viewport.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
