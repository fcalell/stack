---
id: 003-67
status: done
sessions: {}
---
# react-ui: the root place owns its sub-addresses

## Goal
Stead's Now is the root place, and its records live under it: /items/<id>, /jobs/<id> (design/07-interface.md "Addresses"; github.com/fcalell/stead). Below tablet an open item draws no back act to Now's list, a not-found form there loses its Back, and the Now tab is not drawn selected.

## Approach
`isCurrent` (lib/navigate.ts) makes "/" current only at exactly "/", so the Shell hands no PlaceRoute at a root place's sub-address.

## Shape
New ui-core `./route` holds `isCurrent` (moved from both plugins) and `placeAt(places, at)`: the most specific place current at the address, with the root `/` a prefix of every address. Specificity is the longest pathname, then the most query parameters; nested places (`/work` beside `/work/code`) select the deeper one.
Both Shells set `route = placeAt(places, at)`, and the sidebar row, tab and More's `inRest` compare `spec.route === route`. `isCurrent` keeps its rule for rows, since a row linking to `/` is not current everywhere. Plain string parsing, no `URL` (partial in React Native).
An address no place claims (stead's Not found) now selects the root place. Below `tablet` a record under the root leads with the back act to `/`, and a missing item's Back goes to `/`. No new cells, no consumer option (rejected: a `PlaceSpec.owns` list).
Both platforms; tested once in ui-core. Lands in the places unit with 68.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
