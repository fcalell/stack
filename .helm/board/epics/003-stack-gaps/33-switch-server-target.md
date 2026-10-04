---
id: 003-33
status: backlog
sessions: {}
---
# cli: an app switches its server target

## Goal
An app runs on exactly one of cloudflare or node (002-09). `stack remove cloudflare` is refused
as the last target and `stack add node` as a second one, so switching takes a hand edit of
`stack.config.ts`.

## Approach
`stack add` of a one-of option replaces the present one (asking first when interactive), or a
dedicated switch; decide in the story.

## Acceptance criteria
- [ ] (test) adding node to a cloudflare app leaves exactly node.
