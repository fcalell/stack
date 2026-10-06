---
id: 003-112
status: backlog
sessions: {}
---
# react-ui: the text around a disabled field carries the disabled state

## Goal
In a disabled field the text outside the native control (an Input's unit, a TextArea's `5 / 200` budget, a FileInput's name and size, a Slider's label and value) draws in `text-ink-disabled` at 2.5 to 2.8:1, which the rubric exempts ("a disabled part is exempt from the text and boundary floors", WCAG 1.4.3's inactive-component exemption), yet axe's `color-contrast` fails it: `Input`, `TextArea`, `FileInput` and `Slider` `Disabled` stories fail `pnpm stories:test`.

## Approach
axe's `isDisabled` (is-disabled.js) exempts a node only when it, or an ancestor, is a native `fieldset`, `button`, `select`, `input` or `textarea` with `disabled`, or carries `aria-disabled="true"`. Base UI's `Field.Root` and `Slider.Root` mark a disabled field with `data-disabled` alone, so the adornment text has no programmatic disabled state; only the inner control has. The look and the exemption are in the component, the state is not exposed on the part that carries the look. Research: `.helm/research/stories-triage.md`.

## Acceptance criteria
- [ ] Every text that draws `text-ink-disabled` inside a disabled field is programmatically part of the disabled control (a disabled ancestor, or associated with the disabled control), so axe exempts it with no rule or selector excluded.
- [ ] `Disabled` stories of `Input`, `TextArea`, `FileInput` and `Slider` pass.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides.
