---
id: 007-04
status: backlog
sessions: {}
---
# stack: the phone half of the screen workbench

## Goal
A consumer's phone app gets what 007-01 and 007-02 give the web: every Expo route in each query
state from typed fixtures, and the same floors checked.

## Approach
Out of scope until the web half ships. What it would need: route discovery from the Expo routes,
a host (Storybook for React Native on a device, or React Native Web in the web workbench), and the
floors checked on a device the way the design critique drives one (`adb`, dp from the reported
density). The fixtures and forced query states of 007-01 carry over unchanged, since `plugin-api`'s
query client is shared.

## Acceptance criteria
- [ ] The host and the device check are decided, with evidence, once 007-01 and 007-02 are done.

## Open questions
- [ ] React Native Web in the web workbench or on-device Storybook: what each misses of a real
  phone render.
