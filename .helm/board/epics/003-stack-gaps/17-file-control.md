---
id: 003-17
status: backlog
sessions: {}
---
# ui-core: a file control

## Goal
Martechthings imports files (an SDR CSV, analytics and tag manager exports, an app log) from onboarding and the inventory. `Input` kinds are text, search, secret, source, number and email; nothing chooses or takes a dropped file.

## Approach
- References: Neon's import sheet, the input and its run act in the step card ([screen](https://mobbin.com/screens/82420934-9c74-4d7e-a7f8-da5a495b922b)); Customer.io's CSV import ([screen](https://mobbin.com/screens/ea216cbe-fc77-4dd1-ae77-66bb8f2bce1b)).

## Acceptance criteria
- [ ] A control chooses a file or takes a dropped one, shows the chosen name and size, and refuses a wrong type with its reason, on the web and the phone.
