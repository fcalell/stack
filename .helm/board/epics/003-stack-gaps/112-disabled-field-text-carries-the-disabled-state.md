---
id: 003-112
status: done
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

## Decided while building (2026-10-07), by the building session
The part that carries the look exposes the state: the box `div` each `render={(control, state) => …}` returns in `Input`, `TextArea` and `FileInput`, and `Slider`'s root (a `render` function over `Base.Root`, which gives `role="group"` and lays no `aria-disabled` of its own), carry `aria-disabled={state.disabled || undefined}`, so the adornment text (unit, budget, name and size, label and value) has a disabled ancestor and axe's `isDisabled` exempts it. Read in axe-core 4.13.0: `aria-disabled` is a global attribute, allowed on a role-less `div` (`aria-allowed-attr`, and `aria-allowed-attr-elm` lists no `div` restriction) and on `group`, so no role is added, no rule is disabled and no ink changes. The enabled state sets nothing (`undefined`), so a native `disabled` on the control stays the only mark there. Not run in a browser; the `Disabled` stories of the four are the verifier's.

## Decided while building (2026-10-07), by the building session
- The part that carries the look exposes the state: `aria-disabled={state.disabled || undefined}` on the box `div` each `render={(control, state) => …}` returns in `Input`, `TextArea` and `FileInput`, and on `Slider`'s root through `Base.Root`'s `render={(props, state) => <div {...props} aria-disabled=… />}`. The unit, budget, name, size, label and value are descendants of it, so axe's `isDisabled` (an ancestor with `aria-disabled="true"`) exempts them. No rule, selector or contrast changed.
- `aria-allowed-attr` read in axe-core 4.13.0 source: `aria-disabled` is in `globalAttributes`; the box is a role-less `div` (spec `allowedAriaAttrs` unset, so `aria-allowed-attr-elm` passes) and the Slider root carries Base UI's `role="group"`, which takes the global attributes. No role added.
- Base UI 1.8.0 `Slider.Root` reads the disabled state from the `Field` context and exposes it as `state.disabled` to `render`, which is why the state is read there and not from a prop.
- Unverified in a browser: the acceptance criteria stay unticked until the verifier runs the `Disabled` stories.

## Critique
Ship, by a fresh critic at 1280, 768, 1440 and 390, light and dark (scratchpad `critique/fields/report.md`).
