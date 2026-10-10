---
id: 003-213
status: review
sessions: {}
---
# react-ui: an ItemHeader's facts line holds one height whatever kinds of fact it carries

## Goal
Stead's conversation head is an `ItemHeader` whose facts are the thread's status and, once the thread has read outside content, "Read outside content" as a fact that opens its sheet (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx`, the `facts` list at lines 566-578; design/07-interface.md "### Chats"). The status stands alone until the first reply, when the thread is marked and the second fact joins: the head grows about 6 px and the log below it jumps once. Evidence: Stead's second Chats critique, unit u5 at stack `74a0e3d` (the critic's measurement; shot `shP/P-thread-reads-390-light.png` in Stead's scratchpad `critique/u5/` draws the two facts side by side at 390).

## Approach
`ItemHeader`'s facts line (`item-header/index.tsx`) draws a status or a plain fact at its text line, and a fact that opens (`{ label, onOpen }`) as a `PILL_ACT` button holding `min-h-target`, 24 px on the desktop and 44 on touch, taller than the meta line beside it. Facts share one wrapping line (`items-center`), so the line is as tall as its tallest fact and its height depends on which kinds the record carries at that moment. 003-20 held the save fact's height across its states by drawing the widest form unseen; no rule does the same for a line whose facts come and go (a fact that opens, a pick, a count). The app cannot hold the height itself: an opening fact is drawn by stack, and a spacer in the app would be a host element sized by a token. Unchanged at stack `HEAD` past `74a0e3d` (`git log 74a0e3d..HEAD` holds no change to `item-header`).

## Acceptance criteria
- [x] An `ItemHeader` whose facts line gains or loses a fact that opens, a pick or a count keeps the head's height, on both platforms and at every density, so what stands under it does not move (the web height awaits the batch browser run).
- [x] A head whose facts are all text or status is unchanged where no fact that opens can join; a head with no facts line is unchanged.
- [ ] The ItemHeader showcase holds a head whose second fact joins after the first, measured at 390 and 1280 by the critique (the story `FactJoins` is written, awaits the batch run and the critique).

## Open questions
- [x] Its shape (the facts line always standing at the tallest fact's height, a fact that opens drawn at the text line with its hit box reaching beyond it as an icon act does, or another): the stack session decides.

## Ruled
The second shape: the facts line stands at the meta line's height, and a fact that acts (an opening fact, a route fact, a pick, a save) keeps its target-height hit box (`WORD_ACT`) and reaches past the line above and below it by `(target - lh) / 2`. The first shape would have grown every head with facts by the target-minus-line step (about 6 px desktop, 23 px touch), against the second criterion. No prop, slot or token: `ITEM_FACT` loses its `min-h-target` (the controls already carry it through `WORD_ACT`, a count is a text fact), `factReach(density)` (`@fcalell/ui-core/chart`, beside `tickReach`) gives the phone the same reach in px where the web reads `lh`. The loading head's facts line follows: one meta line, not the target.

## Built
ui-core: `ITEM_FACT` is `gap-inside`, `SKELETON_ROW.kind.facts` is `gap-x-fields` (the comments say the line's height), `factReach` in `packages/ui-core/src/chart.ts`. react-ui: `plugins/react-ui/src/ui/components/item-header/index.tsx` gives the opening fact, the pick and the save fact `REACH` (`leading-meta -my-[calc((var(--spacing-target)-1lh)/2)]`, an overlay: the `lh` unit is the web's) and the loading facts row a meta line box (`min-h-lh`). native-ui: `plugins/native-ui/src/ui/components/item-header/index.tsx` gives the same facts `style={REACH}` (`marginVertical: -factReach("touch")`) and the loading row a meta `Strut`. `ui-core.md` says the line's height and the reach. Story `FactJoins` (`apps/showcase/behaviour/item-header-facts.stories.tsx`) joins an opening fact to a status and asserts the head's height is unchanged; written, not run. The wrapped second line of facts below `tablet` keeps the `gap-y-pair` step; its hit boxes overhang into it by the reach.
Native unrendered: the reach is arithmetic on the contract's px, unchecked on a device.

