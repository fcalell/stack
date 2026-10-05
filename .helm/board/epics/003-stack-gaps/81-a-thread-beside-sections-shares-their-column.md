---
id: 003-81
status: backlog
sessions: {}
---
# react-ui: a Thread among Sections shares their column

## Goal
Stead's Now list holds the ask box's exchange (a Thread) among Sections, and a card in Work's main holds its thread excerpt among Sections (github.com/fcalell/stead). At 768 the Thread is inset about 13 px from the rows beside it; at 1440 the card's Sections run the main's full width while its Thread centres at the measure.

## Approach
A Thread that does not fill its page centres its column at the measure (`THREAD_COLUMN = w-full max-w-measure mx-auto`, thread/index.tsx), while its sibling Sections stand at the region's width; no geometry class lines them up. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
