---
id: 003-63
status: review
sessions: {}
---
# react-ui: a form docked in a conversation's foot

## Goal
Stead's question sheet (github.com/fcalell/stead, packages/server/src/app/ui/question-sheet.tsx; design/decisions.md "Questions"; design/07-interface.md "The question sheet") docks in the conversation's input place, the conversation readable above it, when a round is opened from the conversation that asked. Until this ships the round opens in the modal Sheet instead.

## Approach
Thread's foot is "the MessageInput under the messages". A four-question page (options, a note field, Next) placed there measured 457 px in a 740 px viewport at 375 px wide with a banner up: the log shrank to 56 px and Next fell under the tab bar. Nothing bounds the foot's height or scrolls it, and no roster part docks a form there.

## Shape
A `Sheet` passed as a Thread's `foot` (inline or filling) or a Place's `foot` docks there by derivation, with no new prop, through a `FootPlace` context in `lib/frame.ts`. Docked draws no dialog, scrim or portal: `open` false renders nothing; the head holds Back first, then the title over the description, then the close act; the body holds the children; the foot holds the line beside or over a `submit` act.
The docked foot is bounded: `FOOT_DOCKED` gains a structural `max-h-1/2` with `min-h-0`, so the foot is at most half its frame, the body scrolls and the head and acts stay fixed. An inline foot among sections is not bound. On desktop the docked Sheet holds `THREAD_COLUMN`, centred by the foot region. Escape calls `onClose`.
Focus: `focusFirst` (lifted to `lib/focus.ts`) on mount and on each page turn, and closing hands focus back to the returning input.
Both platforms, with a showcase Thread holding a two-page docked Sheet at 375 x 740 with a banner. A critique judges whether a half bound leaves the body enough room on touch, and Back in the head.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
