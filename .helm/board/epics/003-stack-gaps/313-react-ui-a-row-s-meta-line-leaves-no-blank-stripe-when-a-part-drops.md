---
id: 003-313
status: backlog
sessions: {}
---
# react-ui: a row's meta line leaves no blank stripe when a part drops

## Goal
At 440 px the long status form fits by dropping `· main` whole, leaving a blank stripe of about 32 px before the status dot.

Found by the critique of 003-208.

## Acceptance criteria
- [ ] At 320, 390 and 440 in the 440 px list column no gap wider than the normal gap step stands where a dropped part was.
- [ ] The status word is never clipped, as today.
