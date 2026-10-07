---
id: 003-139
status: backlog
sessions: {}
---
# react-ui: an ActionBar has a waiting form that keeps the bar's place

## Goal
Stead's item screens end in a decision bar (Approve, Deny, Edit, the stopped answer's acts) and wait with the header, the "What leaves" Code at three bars and the three rows, with no placeholder for the bar, so the page grows by about 50 px when the read lands (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx`; design/07-interface.md "Items", a loading screen keeps its loaded height). Evidence: item screens critique unit u3, shot `i-loading-1280-light` (Stead scratchpad `critique/u3/`, stack at `5564217`).

Evidence, card critique unit u7 (Stead `c9c9e5a`, shot `h/jl-1440-light`): the job view waits as a head and four stage rows; loaded it adds the Stop bar (44 px and its gap) and the Boundary group, so the page grows when the read lands. Stop is an `ActionBar`, so this story's waiting form covers it.

## Approach
`ActionBar` takes `acts`, `fit` and `chosen` and nothing for a wait (plugins/react-ui/src/ui/components/action-bar/index.tsx). `Act.loading` is a pending act, a spinner on a real label, and the app has no labels before the read lands. Handing it stand-in acts would draw invented words where a bar belongs and put them in the accessibility tree. Leaving the bar out while waiting moves the page. The app's own pending bar does not help: it stands after the act is pressed, not before the acts are known. Every other part with a loaded height has a waiting form (`Prose loading`, `Thread loading`, `Code loading`, 003-127, 003-131, 003-132).

## Acceptance criteria
- [ ] A waiting ActionBar draws act-shaped bars at the loaded geometry (field height, the bar's fit and end, the touch stack) and no text, so the page does not move when the acts land.
- [ ] A bar that does not ask for it is unchanged.
- [ ] The ActionBar showcase holds the waiting form beside the loaded one and the critique measures both heights at touch and desktop.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether `ActionBar` takes a `loading` marker with a count of acts, or a waiting form of its own.

## Decided while building (2026-10-07)
Not built: the shape is a consumer-surface choice, so it waits for a ruling. `ActionBar` takes `acts` (labels the app lacks before the read) and nothing for a wait. Its form follows the contract of 003-131 and 003-132 (a waiting bar draws act-shaped bars at the loaded geometry: the field-high box, the bar's `fit` and end, the touch stack, no text, inside the bar's `PENDING_TRACK` height), but the app has to say how many acts the bar will hold, since the touch stack is one row per act. Options: (a) `loading` on `ActionBar` as a count (`loading={2}`), `true` standing for one act; (b) `loading` as a boolean and a named count (`waits`); (c) `acts` given with empty labels, which puts nothing readable in the tree but breaks the `Act` type's `label`. Recommended: (a), one rule with 003-123 (`loading` is a count where the part's loaded size is a count).
