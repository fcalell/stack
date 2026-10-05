---
id: 003-70
status: backlog
sessions: {}
---
# react-ui: a file row's path keeps its start beside its chip

## Goal
Stead's review lists sensitive files with a chip saying why each is listed (github.com/fcalell/stead, packages/server/src/app/ui/review.tsx; design/07-interface.md "The review screen"). At 375 px the row draws "ome.jso" for biome.json and "d./flags.md" for docs/flags.md, with room to spare.

## Approach
The app passes `path` and `chip` as FileRow's props ask; the cut happens inside FileRow's path parts, which lose the path's start rather than yielding it whole beside the chip (rules.md: the chip stays whole and the path yields). Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
