---
id: 003-06
status: backlog
sessions: {}
---
# ui-core: a Place carries a picker beside its title

## Goal
Martechthings reads every spec screen in a context (Live, one change set, a past version), named in the page head by a picker beside the title. The trigger shows the context with a state chip (Draft, Ready), and the list ends with the act that opens a new context. `Place` takes `title` as a string, `actions` as icon acts, one `act` and `more`, so nothing stands beside the title.

## Approach
- `Picker` already ends its list with one act under a hairline, which is the shape needed.
- `ItemHeader` facts take a pick whose options carry states, but that is a record's head, and the context belongs to the page, since it is part of the address.
- References: Mintlify's branch picker at the editor head, `main` labelled "Default", "Create new branch" closing the list ([screen](https://mobbin.com/screens/0ed0c27b-ed83-4355-910d-eb2b8606ec4e)); GitBook's change request head, title then a Draft chip ([flow](https://mobbin.com/flows/3db142eb-78ed-4b51-9026-40066aadcfc3)).

## Acceptance criteria
- [ ] A Place draws a picker beside its title, its trigger able to carry a state chip, on the desktop strip and the touch top bar.

## Open questions
- [ ] A Place slot, a Picker trigger variant, or both: the stack session decides.
