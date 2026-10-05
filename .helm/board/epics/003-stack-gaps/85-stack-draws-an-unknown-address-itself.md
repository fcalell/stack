---
id: 003-85
status: backlog
sessions: {}
---
# plugin-react, plugin-expo: stack draws an unknown address itself

## Goal
Every consumer needs a page for an address nothing matches. Stead writes its own (`packages/server/src/app/routes/$.tsx`: a `Place` holding "Nothing is at this address." and an act to Now), and each Stack app would write the same, on the web and on the phone.

## Approach
Story 62 gives the app `Missing`, which it composes with a `Place` in its catch-all route. Stack can draw the page itself instead: plugin-react contributes TanStack Router's `defaultNotFoundComponent` through the router's not-found, and the Expo app gets a `+not-found` route, each drawing `Missing` with an act to the Shell's first place. That needs a react-ui to react slot, a title and a sentence word (`notFound`, `nowhere`) and phone routing, so it is cross-plugin and was cut from story 62.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
