---
id: 003-197
status: done
sessions: {}
---
# react-ui: a Thread ends on a waiting message while a reply is on its way

## Goal
Stead's conversation draws a working turn as a loading `Message`, the log's last entry, while the lead works and nothing has streamed yet (design/07-interface.md "### Chats", the Working row: "a loading `Message` as the log's last entry, and the input's working form with Stop before Send", as Linear's thinking is). Today the log ends on the operator's own message, so between the send and the first streamed word nothing in the log says a reply is coming (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx`, `linesOf` at line 276). Evidence: Stead's Chats critique unit u5 at stack `74a0e3d` (Stead scratchpad `critique/u5/report.md`).

## Approach
`Message` takes `loading`, but a `Thread` draws its items through `MessageSlots`, which has no per-item loading slot, and its item renderer never passes `loading` to `Message` (`plugins/react-ui/src/ui/components/thread/index.tsx`). The only waiting form is the Thread's own `loading`, which turns the whole log into three waiting messages, the form for a log still on its way, not one reply. A `<Message loading>` the app stands beside the `Thread` sits outside the scrolling log and breaks the Thread's fill (it must be the region's direct child, 003-163). Unchanged at stack `HEAD` past `74a0e3d`.

## Acceptance criteria
- [x] A loaded `Thread` can end on one waiting message from the other author, inside its log, followed and pinned to as a new message is, and replaced in place by the reply when it streams.
- [x] A Thread with no waiting entry is unchanged; the Thread's own `loading` keeps its three-message form.
- [x] The Thread showcase holds a log ending on a waiting reply at 390 and 1280, measured by the critique.

## Open questions
- [x] Its shape (a `loading` slot on `MessageSlots`, a Thread prop for a pending reply, or another): the stack session decides.

## Ruled
A boolean `replying?: boolean` on `ThreadProps` (both platforms), outside the `query`/`items` source union. In the loaded branch of `logOf`, after the items, it draws `<Message key="replying" author="other" body="" loading />`; pending, failed, missing and empty ignore it. Not a `loading` slot on `MessageSlots` (a per-item slot needs an item, so the app would invent a `body`, `author` and `key` for something that is not a message yet), and not a second meaning of the Thread's `loading`, which stays the log on its way.

## Built
- `plugins/{react,native}-ui/src/ui/components/thread/index.tsx`: the prop, its doc comment and the draw; it sits in the log, so the web content `ResizeObserver` follow and the native newest-first list pin to it as to any message.
- `packages/ui-core/src/roster.ts` (Thread props), both `rules.md`, `.helm/knowledge/architecture/ui-core.md`; `plugins/{react,native}-ui/test/thread.test.ts` pin that it draws only in the loaded branch.
- `apps/showcase/behaviour/thread.stories.tsx`: `EndsOnWaitingReply1280`, `EndsOnWaitingReply390` (the waiting message is the log's last article, the log at its end, its bottom inside the log) and `StreamedReplyReplacesIt` (the reply stands last, no waiting message, the log still at its end).
- Evidence: the three stories pass; the generated Thread stories (rest, loading, error, empty) pass unchanged. Scoped stories run (36 files, 106 tests passed at a peak of 2514 MiB; the sheet and thread behaviour files rerun last, 21 passed), `pnpm check` and the three `verify` suites pass.

## Open
- The last acceptance box (a log ending on a waiting reply at 390 and 1280, measured by the critique) waits on a design critique run by a session that played no part in the work. The repo holds no native story host, so the native draw is pinned by its source test and `verify` only.

Native unrendered: the native-ui change is type-checked and verified, not rendered on a phone.

## Review
Rework, not accepted. Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique (rework): the waiting message (94 px at 1280, 104 at 390) against the reply that replaces it (22 / 48 px): the log jumps 72 / 56 px; the waiting form leads with an author-line bar the unbubbled reply lacks. The structure box is met (the log ends on one aria-busy article, pinned to the end).

## Owner ruling
The owner rules rework: the waiting message draws as the reply it becomes: no author-line bar (the unbubbled reply has none), one skeleton line at the body line height, the same left edge and top. Acceptance at 390 and 1280: the entry's top y is identical waiting and with a one-line reply (the 72/56 px jump becomes 0); a longer reply only adds its extra lines. The log stays pinned to the end, aria-busy, one article.

## Built (rework)
`WaitingReply` (`plugins/{react,native}-ui/src/ui/components/message/waiting.tsx`, internal) is what `replying` draws: the unbubbled `other` article with one skeleton line in a body line box and no author-line bar. `Message loading` is unchanged, so the Thread's own `loading` keeps its three-message form. `apps/showcase/behaviour/thread.stories.tsx`: `WaitingHoldsTheOneLineReplysBox1280/390` assert the waiting entry's top (in the log's content), left and height equal those of a one-line reply that replaces it (0 px), `WaitingOnlyGrowsByALongerRepliesLines1280/390` assert the same top and left with a multi-line reply only taller, all with the log pinned at its end; the earlier three stories pass unchanged (thread.stories 7 of 7). The entry stays one `aria-busy` article. Native unrendered. The critique box stays open.

## Re-review
Accepted 2026-10-10 after the round-2 re-critique: the waiting entry's top and left jump 0 px against a one-line reply; a longer reply only grows.
