---
id: 003-113
status: review
sessions: {}
---
# react-ui: an open non-modal popup carries focus guards axe rejects

## Goal
While a non-modal popup is open (Menu, Select, Picker, a Screen's more menu) the page holds `span[data-base-ui-focus-guard][aria-hidden="true"][tabindex="0"]` elements around it, which axe fails as `aria-hidden-focus`: the `Menu` and `Screen` `Rest` stories and `Select` `Selected` fail `pnpm stories:test` (the frames hold their popup open).

## Approach
Base UI's `FloatingPortal` renders the guards only for an open, non-modal popup (`shouldRenderGuards = !modal && open && portalNode`) from `FocusGuard`, which is `tabIndex=0` and `aria-hidden` on purpose (only VoiceOver on WebKit gets `role="button"` instead): a Tab onto a guard hands focus into or past the popup at once and a screen reader skips it, so no user stops on one, but the DOM a real session has when a popup is open fails the rule, and Base UI offers no prop to drop them. The decision is the stack session's: take the fix upstream, mount popups modal so no guard renders, or record the rule's exception for the library's own guard in one place. Research: `.helm/research/stories-triage.md`.

## Acceptance criteria
- [x] An open Menu, Select and Picker pass axe `aria-hidden-focus`, or the decision to except Base UI's guard is recorded where the rule is configured.
- [ ] `Menu` `Rest`, `Screen` `Rest` and `Select` `Selected` pass `pnpm stories:test`.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Decided while building (2026-10-07), by the building session
One recorded exception, as 003-75 decided for the menu: `[data-base-ui-focus-guard]` is excluded from axe once where each run is configured, `a11y.context.exclude` in the showcase preview (`.storybook/focus-guard.ts`, spread into the story-level excludes that replace it, since Storybook overwrites arrays) and in the screens floors (`floors.ts`), each with a `// TODO:` naming the limit (Base UI 1.8.0 draws focusable `aria-hidden` guards on purpose, no prop) and the trigger (a release whose guards are not focusable or not hidden). Modal popups and an upstream issue are not taken.
