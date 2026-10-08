---
id: 003-89
status: review
sessions: {}
---
# react-ui: a code block that wraps

## Goal
Stead's Action item shows an act's arguments whole under the verb (design/07-interface.md "Item screens", Action; github.com/fcalell/stead). At 375 a URL argument is cut and scrolls sideways.

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), shots add-key, repo-390-light, repo-768-dark: Code never wraps, so the deploy key the operator must copy and paste (cut at "stead deploy key for") and git's failure text in a failed fetch's block read cut at rest on a phone.

## Approach
`Code` never wraps (`overflow-x-auto whitespace-pre` in code/index.tsx) and takes no wrap prop; arguments a decision rests on must read whole on a phone. Seen at stack f6563f6.

## Acceptance criteria
- [x] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Built
`Code` keeps its line breaks and wraps a long line anywhere (`whitespace-pre-wrap wrap-anywhere`), with no `wrap` prop and no sideways scroll, on both platforms: react-ui's text drops `overflow-x-auto` and its scroll-driven tab stop (the text is focusable by script alone, where the fold lands), native-ui's text is a plain `Text` in a `View` instead of a horizontal `ScrollView`. The consumers read right: `Prose`'s fenced block is a `Code`; `Diff` and `ProseDiff` do not use it (a diff already wraps under itself). A waiting `Code` is the three bars it was, and its height on load changes by the lines that wrap (noted in ui-core.md). Evidence: `behaviour/code.stories.tsx` (a 320 px frame, a 130 character key: nothing scrolls, the text is whole), and the Code, Prose and Thread stories pass.
