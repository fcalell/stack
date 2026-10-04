---
id: 005-03
status: review
sessions: {}
---
# react-ui, native-ui: a Place or Split chooses its body before a Thread mounts in it

## Goal
A mounted `Thread` calls `fills(true)` in a layout effect (web `components/thread/index.tsx:179-183`,
phone `thread/index.tsx:193-197`) and its frame swaps its body. On the web, Place
(`place/index.tsx:165`, `:269-274`) and Split (`split/index.tsx:81`, `:101-118`) commit twice
on mount, and the log's first follow runs in the inset layout. On the phone the swap changes the
parent element type, `<Scroll>` to `<View>` (Place `:181-203`, Split `:104-120`), so the Thread
and every sibling remount: a Thread that mounts late drops its siblings' typed text, open Menus
and fold state.

## Approach
Decided by fcalell (2026-10-04): a frame learns what its children need up front, through props
or slots, never from a layout effect or a post-paint state push; a registration that must stay
(the parent cannot know a child's kind statically) is read in render from a host object.

The frame knows its body form at first render: a prop or slot that holds the conversation, as
`bleed` and `foot` already do, or on the web a `has-[>[data-fill]]` body variant over a Thread
that marks itself. The phone body keeps one element type in every form. `ThreadFills`, the
`fills` state in Place and Split, and Thread's layout effect go.

## Acceptance criteria
- [x] (test) `ThreadFills` and `fills` are gone from both plugins' Place, Split and Thread.
- [ ] (live) web, assistant and home at 1440 and 375: Place commits once on mount (React profiler), and the log stands at its end in the first frame.
- [ ] (live) phone, on the harness: a Thread mounting late beside a typed field keeps the field's text, in a conversation this story adds to `apps/phone` (it holds no Thread today); 04 and 11 reuse it.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 1440 and 375: a Place renders in one commit on mount, and the assistant's log is filled and at its end from its first frame. The web's marked forms stay in the overlay (the contract forbids platform conditionals in cells), held to the cells by `fill.test.ts`. A Thread stands as the body's or the main's direct child. `apps/phone` gains an Ask place for the phone check. Open: the phone live criterion on the harness.
