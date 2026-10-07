---
id: 003-99
status: review
sessions: {}
---
# react-ui: a desktop Sheet's head has even room and one height

## Goal
On desktop the Sheet head draws its title ~14 px from the top edge with the subtitle tight under it, and its height changes with its content: 70 px with a subtitle (`sheet-1440-light`, `review-evidence-1440-light`) against 56 px with none (`new-thread-code-1440-light`), so the body's first field jumps between sheets. Stead: the question sheet and `routes/chats/-components/new-thread.tsx`.

## Approach
`SHEET_HEAD` = `gap-pair px-card py-pair border-b border-edge` (variants.ts) with the row's height set by the 44 px acts; a head with a subtitle stacks it inside that height, one without leaves the row at the act height. Story 91 is the touch head's title width only.

## Acceptance criteria
- [x] The head's title and subtitle have even room above and below, desktop.
- [x] The head's height is the same with or without a subtitle or back act.

## Built

The desktop side sheet's head row is a two-line row tall (`min-h-row-2`, local to `plugins/react-ui/src/ui/components/sheet/base.tsx`; the centred decision and touch keep their own), so a title alone and a title over a description share one head height with the text block centred in it. Sheet's roster entry owns `row-2`. `ui-core.md` scopes the earlier rejected title-only minimum to the section head. Evidence: `pnpm --filter @fcalell/ui-core verify` 34/34 and `pnpm --filter @fcalell/plugin-react-ui verify` 13/13 (token ownership). The head heights themselves are measured by the critique; no test pins them.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
