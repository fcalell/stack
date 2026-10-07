---
id: 003-150
status: backlog
sessions: {}
---
# react-ui: an ActionBar that follows an ItemHeader stands a pair under it, not a sections gap

## Goal
Stead's job view puts "Stop the job" in an `ActionBar` right after its `ItemHeader` (design/07-interface.md "The job view": the bar "under the head", in sight where the operator watches). Rendered, the bar sits about 56 css px under the facts line before Stages begin, which reads as dead space between the head and its act (shot `job-1920-light`). Evidence: card critique unit u7 (Stead scratchpad `critique/u7/shots/x/`, Stead `c9c9e5a`, stack `5564217`); 003-139 gives the same bar a waiting form, which keeps this gap.

## Approach
A Place or Screen body is `gap-sections p-page` (`PAGE_BODY` in ui-core variants), so every sibling, the `ActionBar` included, stands a sections gap from the head. An ActionBar that is the head's own act has no way to join the head: the head draws its facts and nothing after them, and an `ActionBar` has no tighter placement. The app cannot wrap the two in a host element with a gap (the gap is the part's to give). 003-96 sets the bar's own fit; 003-43/-44 put facts and acts in the head but not a block-level bar.

## Acceptance criteria
- [ ] An `ActionBar` directly after an `ItemHeader` stands a pair step under it (or the head takes the act), and the page's following section keeps the sections gap.
- [ ] The ItemHeader showcase holds a head with a bar beneath it, measured at 390 and 1440.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
