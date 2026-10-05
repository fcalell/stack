---
id: 003-26
status: review
sessions: {}
---
# ui-core: a rail of fixed states

## Goal
A Martechthings requester follows a request through fixed states (Submitted, In spec, In build, Live): done ones dated, the current one marked, later ones grey, and Rejected ending the rail with its reason. `activity-feed` draws past events, and onboarding draws step progress.

## Approach
- References: Mercury's application timeline ([screen](https://mobbin.com/screens/2a7de612-6f88-42d7-bce5-1d8fe2219314)); Fiverr's Track Order list ([screen](https://mobbin.com/screens/d2e44bd4-8571-4f2d-97f9-f0918abdb355)).

## Acceptance criteria
- [ ] A vertical rail of known states with done, current and future forms and a terminal alternative, at phone width.

## Shape
New content molecule `Stages { steps: readonly Stage[]; ended?: { label: string; reason: string } }`, `Stage = { label: string; state: "done" | "current" | "later"; at?: string }`, drawn top to bottom on a 1 px `edge` rail. Done: a check at `icon-meta`, the label at body, `at` as a moment at meta. Current: the active status dot, the label at body strong, `aria-current="step"`. Later: a hollow mark, the label at meta. `ended` replaces every step after the last done one with a terminal row (failed mark, label, reason at meta). Range: `patterns/state-rail.md`.
