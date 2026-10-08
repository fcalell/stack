---
id: 005-19
status: done
sessions: {}
---
# react-ui, native-ui: markdown, diffs and QR codes derive once per input

## Goal
Costly derivations rerun on every render, with unchanged input: `Prose` lexes and folds its
markdown (web `components/prose/index.tsx:334`, phone `:315`); `Diff` runs `structuredPatch`
(web `diff/index.tsx:163`, phone `:161`); `ProseDiff` runs `diffWords` and rebuilds its runs (web
`prose-diff/index.tsx:54`, phone `:61`); `QrCode` encodes the value and walks its modules (web
`qr-code/index.tsx:52`, `:81`; phone `:66`, `:82`), even while loading, when only the module
count is drawn. `Message` is not memoised and renders `Prose` per reply (phone
`message/index.tsx:263`), so each new message or streamed token re-lexes the whole log.

## Approach
Each derivation is memoised on its text inputs, with the hooks before the `loading` return (or
`loading` split into its own component). The QR skeleton uses a fixed module count and encodes
nothing. `Message` is memoised on primitive props, so a Thread re-render skips unchanged
messages.

## Acceptance criteria
- [ ] (live) web, assistant at 1440: a new message renders only that Message (React profiler); changes re-renders its Diff without re-diffing when an unrelated parent state changes.
- [ ] (live) phone, on the harness: a new message in 03's conversation re-renders only that Message.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Measured on the web without the React Compiler (a consumer's copy is not compiled) at 1440: Diff, ProseDiff, Prose and QrCode keep their derivations through an unrelated parent re-render, and a keystroke or a Send in the assistant renders only the new Message and the two system lines (master: all six). Open: a system line still re-renders, since the Thread builds its `onOpen` and `detail` per render (a follow-up in 005-17); the phone live criterion on the harness.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/data/report.md`).
