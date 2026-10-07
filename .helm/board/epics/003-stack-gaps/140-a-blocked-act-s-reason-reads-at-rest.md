---
id: 003-140
status: backlog
sessions: {}
---
# react-ui: a blocked act's reason reads at rest

## Goal
Stead's review screen blocks Approve while a sensitive file is unopened, and the reason ("1 sensitive file not yet opened.") shows only after a press: on desktop a hover shows nothing (the cursor stays default) and on the phone the line appears once the dead button is tapped, so a sighted reader meets a grey act with no cause (github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx:340`, `blocked: blocked ?? unopened`; design/07-interface.md "The review screen", the bar's last blocked act names its reason). Evidence: item screens critique unit u4, shots `blocked-390-light`, `blocked-tap-390-light`, `blocked-hover-1280-dark` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

## Approach
`ActionBar` hands a blocked act's reason to `Reason` (plugins/react-ui/src/ui/components/button/reason.tsx), which is `hidden` until `shown`, and `shown` follows a press of the blocked act (`press`/`pressed` in action-bar/index.tsx); the act holds the reason as its `aria-describedby`, so only a screen reader hears it at rest. `ReasonKept` can hold the line's height, invisible, which stops the shift but not the silence. Nothing in the app can draw it without a second line of text beside the bar, which is the part's own job. 003-103 is the blocked label's contrast and the touch slab, not whether the reason shows; 003-128 is an icon act's blocked form.

## Acceptance criteria
- [ ] A blocked act in an ActionBar shows its reason at rest, in the bar (under the stack on touch, beside or under the acts at the end on desktop), at meta size, without a press or hover.
- [ ] The reason stays the act's description for assistive technology and the press still announces nothing twice.
- [ ] The bar holds the line's height whether or not an act is blocked where the app asks for it, so unblocking moves nothing.
- [ ] The ActionBar showcase holds a blocked act with its reason at rest and the critique measures it at touch and desktop, light and dark.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether the reason always shows or the Act asks for it, and how several blocked acts share one line. Reference: GitLab's merge box ("Merge blocked: 1 unresolved thread", cited in design/07-interface.md).
