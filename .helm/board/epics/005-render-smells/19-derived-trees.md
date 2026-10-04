---
id: 005-19
status: backlog
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
