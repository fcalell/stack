---
id: 003-128
status: backlog
sessions: {}
---
# ui-core: an icon act stands blocked or pending

## Goal
Stead's file screen draws Previous file and Next file as icon acts in its head, and while the review that holds the file list loads they should stand disabled in place so the head does not change when the read lands (github.com/fcalell/stead, `packages/server/src/app/routes/_now/-components/file-screen.tsx`, `actions`; design/07-interface.md "Items", the file screen). Waiting, the head draws Back alone, and Previous, Next and More appear on load. Evidence: item screens critique unit u4, shot `e-fload-390-light` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

## Approach
`IconAct` is `{ icon, label, onAct }` (ui-core/src/descriptors.ts) and `IconButton` takes the same three props, so an icon act can be neither blocked nor pending, where `Act` carries `blocked` and `loading`. `IconButtonBase` already draws a disabled form (MessageInput's touch Stop uses `disabled`), but nothing public reaches it. The app can only leave the acts out while waiting, which moves the head, or give them an `onAct` that does nothing, which draws an enabled act that is not (a workaround). Not 003-103 (a labelled Button's disabled contrast). Seen at stack `5564217`.

## Acceptance criteria
- [ ] An icon act can be drawn blocked (inert, its reason read aloud, keeping focus as a blocked Button does) and pending, in every place a `IconAct` stands: a Place's or Screen's actions, a Section's act, a Switcher's act.
- [ ] An icon act with neither is unchanged.
- [ ] The IconButton showcase holds the blocked and pending forms beside the rest form and the critique judges their contrast and touch size.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether `IconAct` takes the same `blocked` and `loading` as `Act` or a smaller state.
