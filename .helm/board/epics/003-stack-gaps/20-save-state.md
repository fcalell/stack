---
id: 003-20
status: backlog
sessions: {}
---
# ui-core: a field that saves as typed shows a failed save with retry

## Goal
Martechthings' meaning fields save as they are typed, with one quiet line in the record head ("Saving…", "Saved", "Not saved: retry"). An `ItemHeader` words fact draws the first two. The failed state needs its retry act, and no fact carries an act.

## Approach
- Reference: Ditto's "Synced 2 minutes ago" in the pane head ([screen](https://mobbin.com/screens/1d5dc347-18b4-4529-bca6-2774a8371df7)).

## Acceptance criteria
- [ ] A record head shows a failed save with a retry act, announced politely.

## Open questions
- [ ] A fact with an act, or a `Banner`: the stack session decides.
