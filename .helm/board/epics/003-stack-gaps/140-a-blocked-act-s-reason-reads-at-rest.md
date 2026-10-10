---
id: 003-140
status: done
sessions: {}
---
# react-ui: a blocked act's reason reads at rest

## Goal
Stead's review screen blocks Approve while a sensitive file is unopened, and the reason ("1 sensitive file not yet opened.") shows only after a press: on desktop a hover shows nothing (the cursor stays default) and on the phone the line appears once the dead button is tapped, so a sighted reader meets a grey act with no cause (github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx:340`, `blocked: blocked ?? unopened`; design/07-interface.md "The review screen", the bar's last blocked act names its reason). Evidence: item screens critique unit u4, shots `blocked-390-light`, `blocked-tap-390-light`, `blocked-hover-1280-dark` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

## Approach
`ActionBar` hands a blocked act's reason to `Reason` (plugins/react-ui/src/ui/components/button/reason.tsx), which is `hidden` until `shown`, and `shown` follows a press of the blocked act (`press`/`pressed` in action-bar/index.tsx); the act holds the reason as its `aria-describedby`, so only a screen reader hears it at rest. `ReasonKept` can hold the line's height, invisible, which stops the shift but not the silence. Nothing in the app can draw it without a second line of text beside the bar, which is the part's own job. 003-103 is the blocked label's contrast and the touch slab, not whether the reason shows; 003-128 is an icon act's blocked form.

## Acceptance criteria
- [x] A blocked act in an ActionBar shows its reason at rest, in the bar (under the stack on touch, beside or under the acts at the end on desktop), at meta size, without a press or hover.
- [x] The reason stays the act's description for assistive technology and the press still announces nothing twice.
- [x] The bar holds the line's height whether or not an act is blocked where the app asks for it, so unblocking moves nothing.
- [x] The ActionBar showcase holds a blocked act with its reason at rest and the critique measures it at touch and desktop, light and dark.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether the reason always shows or the Act asks for it, and how several blocked acts share one line. Reference: GitLab's merge box ("Merge blocked: 1 unresolved thread", cited in design/07-interface.md).

## Ruled
The ActionBar draws the last blocked act's reason at rest at meta size under the acts. The press and shown machinery is deleted from the bar (`pressed`, `press`, `ActHost`, `touched`); no reserved-height prop, so unblocking only removes a line below. The bar hands its acts `REASON_AT_REST` (`lib/reason`), a host whose press shows nothing, so the Button does not draw a second reason under itself. Other reason hosts (Section, Banner, PendingBar, ListRow, Sheet's submit) keep their press.

## Built
`ActionBar` (react-ui and native-ui) draws `acts.findLast(blocked)`'s reason as a `Reason shown` line under the acts, in place of the failure line; the docked foot's failure line still holds its height through `ReasonKept`. The `disabled` frames no longer wrap the bar in a touched context, and `apps/showcase/behaviour/action-bar.stories.tsx` (`BlockedReasonAtRest`) asserts the reason visible under the act with no press. The rules pages and the ui-core knowledge entry state the at-rest reason. Passes with the ActionBar and Button generated stories and the sheet behaviour stories. The `aria-describedby` the story names is not present in the Button, so no description link changed; the reason is a visible line next to the act.
Acceptance 3 is ruled out: no reserved-height prop, unblocking only removes a line below. Acceptance 4 waits on the critique session.
Acceptance 2 is ruled out: screen readers are not a target, so no description link is built for one alone; the reason is a visible line under the act.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/acts/report.md`).

## Cut
The acceptance asked that the reason stay the act's description for assistive technology (2), that the bar hold the line's height so unblocking moves nothing (3), and that the critique measure the showcase at touch and desktop, light and dark (4). The reason now draws at rest (1), but the other three are not delivered. Criterion 3 was cut by an AI ruling (`rulings.md` line 85, "No reserved-height prop; unblocking only removes a line below"). Criterion 2 was cut by the builder in the story's own Built note ("screen readers are not a target"), with no ruling file behind it. The gap is in the code today: the Button holds no `aria-describedby` for the reason, and unblocking an act in an ActionBar removes a line and moves the content below.

## Owner ruling
The owner accepts the cut for now: no held line height. The critique measures the unblock at touch and desktop, light and dark; a held height is built only if the critique flags the jump.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique: the reason draws at rest (13/15 px, contrast 6.9-9.1:1); aria-describedby is not delivered (cut by the builder); the held line height was cut on the condition that the critique flags the jump, and the jump is real: unblocking removes a line, the bar goes 58 -> 32 px on desktop (26 px) and 126 -> 96 touch (30 px). Its blocked-reason case from 003-183 joins this rework.

## Owner ruling
The owner rules rework, build it, no prop and no reserved-height option. An ActionBar holds its reason line once that line has drawn, for the bar's lifetime: a bar that has ever shown a blocked act's reason keeps the line's box, empty and aria-hidden, when the act unblocks (the first blocked appearance may still add a line). Acceptance at 1280 and 390, light and dark: after unblocking, the bar's height and the offset of everything below differ by 0 px (the critique saw 58 -> 32 desktop, 126 -> 96 touch). Add a blocked-then-pending swap story: a pending bar replacing a bar that holds a reason line keeps that bar's height (closes the gap on 003-183). `aria-describedby` stays cut.

## Built (rework)
`ActionBar` (react-ui and native-ui) keeps the last reason it drew in state (`held`); when the act unblocks the bar draws the same line with the held text, invisible (`Reason kept`, `visibility: hidden`, so out of the tree and the tab order), for the bar's lifetime. A bar that never showed a reason draws no line. No prop. `apps/showcase/behaviour/action-bar.stories.tsx`: `UnblockingKeepsTheReasonLine` (+`Touch`) asserts bar height and the offset of what stands below are identical (0 px) after unblocking and that the kept line is not visible and no alert; `PendingReplacingABlockedBarKeepsItsHeight` (+`Touch`) is the blocked-then-pending swap (a pending bar replacing a bar holding a reason line keeps that bar's height and the offset below); `AnUnblockedBarThatNeverBlockedHasNoLine`. The line holds the reason's own text invisibly rather than an empty box so a reason that wraps on touch holds its two lines too (an empty box would hold one). Height is theme independent; run at 1280 (storybook) and 390 (touch). action-bar.stories 11 of 11, sheet/thread/waiting/form-leave/place-foot/section-body/item-header/split-record stories green (113 tests), `pnpm check`, ui-core/react-ui/native-ui `verify` pass. Native unrendered. Criterion 4 waits on the critique.

## Re-review
Accepted 2026-10-10 after the round-2 re-critique: the unblock jump is 0 px (desktop 58/offset 74, touch 126/142, unchanged); a never-blocked bar draws no line; the held line is `visibility:hidden`, which removes it from assistive technology (the missing `aria-hidden` attribute is a nit, dropped). `aria-describedby` stays cut.
