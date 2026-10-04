---
id: 003-50
status: review
sessions: {}
---
# ui-core: a way back to the newest message

## Goal
A reader scrolled up in a conversation while the agent streams has one act back to the newest message, standing above the input. Any long session or thread in Chats. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`Thread` follows each arriving message only while the reader is at the end and offers nothing once they have scrolled up. A `Toast` is an act's result, times out, and stands above the docked input on touch.

Reference: Linear's "Latest" pill over the composer ([screen](https://mobbin.com/screens/afa62cbe-083b-4234-ad90-8a689d8e28cd)); Claude web ([screen](https://mobbin.com/screens/17a974ca-aef7-4859-94fd-031d571f3904)); Mistral ([screen](https://mobbin.com/screens/2d750238-9093-46b0-bde8-9afde16be265)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Progress
Shape: no prop; a "Latest" secondary Button floats above the foot whenever a filling Thread's reader is scrolled up, through the internal `ToLatest` context and `Latest` component, so a docked foot elsewhere reuses it. `THREAD_LATEST` is `mb-pair rounded-control bg-raised shadow-float`, for the design critique. Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live check (web per batch, phone on the harness).
The web design critique's findings are fixed and measured at 1440 and 375 (light).
