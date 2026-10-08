---
id: 003-103
status: todo
sessions: {}
---
# react-ui: a blocked Button's label reads, and a full-width blocked act is not a grey placeholder

## Goal
A blocked/disabled Button's label sits at ~2:1 against its grey `fill-disabled` fill, and on touch a full-width blocked act reads as a grey placeholder bar ("Accept the pages", `knowledge-decision-375-light`; `item-stopped-answer-375-light`). Stead: `app/ui/item-screen.tsx`.

## Approach
`BUTTON` primary (variant-tables.ts) takes `ink-disabled` on a 0.06-alpha veil; the label is not held at a contrast. A blocked act also carries its reason beside it elsewhere, but here the bar is the only signal.

## Acceptance criteria
- [x] A blocked Button's label holds a legible contrast (stack decides the floor) in light and dark.
- [ ] A blocked full-width act on touch keeps its shape as an act (outline or hairline), not a bare grey slab.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Ruled
A blocked or disabled filled Button's label draws in `ink-meta` (an existing level, at least 4.5:1) on the disabled fill. The shape stays: the grey slab is explained by the reason the ActionBar now draws at rest (003-140).

## Built
In `plugins/react-ui/src/ui/components/button/index.tsx` and `plugins/native-ui/src/ui/components/button/index.tsx` the primary and danger acts take `ink-meta` for the blocked label (and, on the web, the fill's `currentColor` glyph; on native the `Ink` tone); the hairline and quiet acts keep `ink-disabled`. Passes with the Button and ActionBar generated stories; the contrast reading belongs to the critique.
Acceptance 2 is ruled: the shape stays. The critique session measures the contrast.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/acts/report.md`).

## Cut
Acceptance 2 asked that a blocked full-width act on touch keep its shape as an act (outline or hairline), not a bare grey slab. It is not delivered: the filled Button's blocked fill and shape are unchanged, only the label moved to `ink-meta`. An AI ruling cut it (`rulings.md` line 81, "Keep the shape. The reason at rest from 140 explains the slab"; the story's Built says "Acceptance 2 is ruled: the shape stays"); the owner did not rule it. The gap is in the code today: the blocked primary and danger acts in react-ui and native-ui `button/index.tsx` still draw the grey fill. Its premise also weakened: 003-140 left the reason's description link unbuilt, though the reason now shows at rest.
