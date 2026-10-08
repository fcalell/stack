---
id: 003-128
status: done
sessions: {}
---
# ui-core: an icon act stands blocked or pending

## Goal
Stead's file screen draws Previous file and Next file as icon acts in its head, and while the review that holds the file list loads they should stand disabled in place so the head does not change when the read lands (github.com/fcalell/stead, `packages/server/src/app/routes/_now/-components/file-screen.tsx`, `actions`; design/07-interface.md "Items", the file screen). Waiting, the head draws Back alone, and Previous, Next and More appear on load. Evidence: item screens critique unit u4, shot `e-fload-390-light` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), shot fetch-pending (`repos.tsx:96`): the repo's Fetch now is an icon act; while the fetch runs the act cannot show it is pending, and only the ItemHeader status says "Fetching" (small, 4 s late). The pending form of an icon act would stand on the act itself.

## Approach
`IconAct` is `{ icon, label, onAct }` (ui-core/src/descriptors.ts) and `IconButton` takes the same three props, so an icon act can be neither blocked nor pending, where `Act` carries `blocked` and `loading`. `IconButtonBase` already draws a disabled form (MessageInput's touch Stop uses `disabled`), but nothing public reaches it. The app can only leave the acts out while waiting, which moves the head, or give them an `onAct` that does nothing, which draws an enabled act that is not (a workaround). Not 003-103 (a labelled Button's disabled contrast). Seen at stack `5564217`.

## Acceptance criteria
- [x] An icon act can be drawn pending in every place an `IconAct` stands (blocked is not built: see Ruled).
- [x] An icon act without `loading` is unchanged.
- [ ] The IconButton showcase holds the pending form beside the rest form; the critique judges its contrast and touch size.

## Open questions
- [x] Its shape: `loading` only (see Ruled).

## Ruled
`IconAct` takes `loading?: boolean` only, with `Act`'s meaning: inert, the glyph swapped for the spinner, size unchanged. `blocked` lands with the first consumer that is inert for a reason other than pending.

## Built
- `IconAct.loading` in `packages/ui-core/src/descriptors.ts`; `IconButton` lists `loading` and a `loading` state in the roster.
- react-ui and native-ui `IconButton` and `IconButtonBase` take `loading`: the press does nothing, the button is `aria-busy` and keeps focus (react), the glyph is the spinner in the rest ink, the square is unchanged. Place and Screen actions spread it; Section's act, Input's act, DefinitionRow's act and the Switcher's act row pass it on.
- Showcase: the `ICON_BUTTON` frames draw the `loading` state; `behaviour/icon-button.stories.tsx` `Loading` asserts inert, busy, no glyph and the same size as a resting act. Generated `IconButton` stories pass.
- Both `rules.md` name `loading` on `IconAct`.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/acts/report.md`).
