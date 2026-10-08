---
id: 003-73
status: review
sessions: {}
---
# react-ui: a beside record's headings follow its title below wide

## Goal
Stead opens a lead, a sink, Add a repo, a job and a stage's output beside their section or record (github.com/fcalell/stead, packages/server/src/app). axe reports heading-order at 375 and 768 px, clean at 1440.

## Approach
Below `wide` a `beside` Screen's title becomes the page's h1 while its body's Section headings stay h3 (`header > h3`): at 768 a lead reads H1 Code, H3 Code, H3 Spoken forms; at 1440 H1 System, H2 Code, H3 …. Seen at stack f6563f6.

## Shape
Web only (native's `header` role has no level). A beside Screen is a head of its own, as a pushed Screen is: its title is an `h1` and its body's sections start at `h2`, at every width. The Place's `h1` stays in the DOM, undrawn with its head (`HEAD_BESIDE`) below `tablet`; nothing is duplicated and nothing swaps. The Screen drops `screenLevels`; `HeadingContext` hands 2 from a Place or a Screen.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Rework: at 390 no h1 has a box; the Place's `h1` stands in a display:none head with no twin, so the top visible heading is the h2 "History". At 768 and 1440 an h1 stands.

## Rework
Ruled (rulings-6): a beside Screen titles at `h1` and its sections at `h2` at every width. A hidden twin `h1` duplicates content, a ResizeObserver swap breaks 005-02/03 and re-renders the subtree after paint, and a CSS-only swap needs two title nodes. At 390 the Place's head is `display: none`, so the record's `h1` is the one visible and `page-has-heading-one` passes; from `tablet` two heads stand, so two `h1`s, the price of a fixed tree. Evidence: `behaviour/split.stories.tsx` `BesideHeadings390`, `BesideHeadings768`, `BesideHeadings1440` (a visible `h1`, the first visible heading an `h1`, the record's sections `h2`).
