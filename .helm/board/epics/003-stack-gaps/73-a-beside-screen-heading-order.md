---
id: 003-73
status: backlog
sessions: {}
---
# react-ui: a beside record's headings follow its title below wide

## Goal
Stead opens a lead, a sink, Add a repo, a job and a stage's output beside their section or record (github.com/fcalell/stead, packages/server/src/app). axe reports heading-order at 375 and 768 px, clean at 1440.

## Approach
Below `wide` a `beside` Screen's title becomes the page's h1 while its body's Section headings stay h3 (`header > h3`): at 768 a lead reads H1 Code, H3 Code, H3 Spoken forms; at 1440 H1 System, H2 Code, H3 …. Seen at stack f6563f6.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
