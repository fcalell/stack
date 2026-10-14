---
id: 003-332
status: backlog
sessions: {}
---
# react-ui: a Pane enters, leaves and covers by a view transition

## Goal
The frame was designed with motion on the web: the router runs navigations as same-document view transitions, each Pane carries a `view-transition-name`, and the motion is CSS on `Pane`, so a Pane entering, leaving or covering, and the other columns taking their new widths, animate with no component knowing about animation. Today only the settle uses a view transition (`lib/settle`); a Pane opening or closing, or a Pane covering the page, switches at once. (On the phone, expo-router's stack animates a push already.)

## Approach
The motion is designed in `.helm/research/motion.md` (§3 navigate), and it is built in phase 4 of that page.

TanStack Router's `defaultViewTransition` and a link's `viewTransition` types (set from the `react` plugin's router binding, a slot of `plugins/react`), each Pane named by `view-transition-name: match-element`, and the pseudo-element motion in `globals.css` from the motion scale, off under `prefers-reduced-motion`. A `grid-template-columns` transition cannot serve (an `auto` track flips discretely), and the Place is a flex row. Check it against the settle, which skips while any view transition runs (the router's), and against the motion rules (003-329).

## Acceptance criteria
- [ ] Opening a record, closing it and a covering Pane animate on the web by view transition, the other Panes taking their new widths.
- [ ] Under reduced motion the page changes at once.
- [ ] A Pane's scroll, typed text and focus survive the transition, and `stack screens test` passes.
