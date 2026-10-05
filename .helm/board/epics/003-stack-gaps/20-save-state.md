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
- [x] A fact with an act, or a `Banner`: the stack session decides.

## Shape
`ItemHeader`'s `Fact` gains `{ save: "saving" | "saved" | "failed"; onRetry: () => void }`, stack-owned words `saving`, `saved`, `notSaved` and the existing `retry`, in a polite live region. Saving and saved are meta-ink facts; failed is the `failed` status mark with `notSaved` and a `Button` `secondary` at the `bar` fit labelled `retry`.
