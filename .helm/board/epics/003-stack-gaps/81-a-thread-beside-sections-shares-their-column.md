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

## Shape
Web only: the phone's inline Thread draws no measure column. Rule C1: a column cell is a width and alignment belongs to its region. `THREAD_COLUMN` becomes `w-full max-w-measure` without `mx-auto`, so a Thread among Sections keeps their start, at the measure, ragged against full-width Groups as a `Text` paragraph is.
The regions that own their frame's width centre: the filling Thread's log and the docked foot gain `items-center`, and `COLUMN_FILLED` (`thread/fill.ts`) restates the centring. `ACTION_BAR_SELECTION` drops `mx-auto` the same way; it only docks, so it still centres. `MessageInput` keeps `THREAD_COLUMN`.
Rejected: the inline Thread at the region's full width. `overlays.ts` gains `items-center`; a showcase Thread among Sections at 768 and 1440, and one rules sentence. Same unit as 82.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
