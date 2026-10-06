---
sessions: {}
---
# Consumer screens

## Goal
An app built on stack gets a screen workbench from stack: one command serves every route of the
app in each of its query states from typed fixtures, a second checks those screens headlessly
(axe with the page-level rules, the rubric's numeric floors), and stack's lint rejects what the
web rules forbid. The consumer writes no story, harness or config: stack derives the workbench
from what the app already declares (its routes, its procedures, the roster).

## Breakdown rationale
Decided by fcalell (2026-10-06): stack stays a framework, never an agent. Its tooling is what a
person would run the same way (a dev server for screens, a test runner, a linter); what an agent
needs to work on stack lives in the docs, rules and guide pages. So there is no critique or gap
command: the design critique and the gap recipe stay guide pages, and the critique keeps only the
judged questions once the numeric floors are tests.

The showcase's Storybook is the prototype. Its page stories
(`apps/showcase/.storybook/page-stories.tsx`) render the `/layout` places from a list
(`plugins/react-ui/src/ui/showcase/pages.ts`) by handing `LayoutPage` its `Here` directly; its
fixtures force a query's state (`useFixture`, `&query=loading|error|missing|empty` in
`showcase/layout/here.ts`); its Vite adaptations of stack's generated config live in
`apps/showcase/.storybook/stack-vite.ts`, held there until a second consumer needs them, which
this epic is.

Build order: 01 serves, 02 checks what 01 serves, 03 is independent, 04 is recorded scope.

- **01**: the serve command: route discovery, typed fixtures, forced query states, the config
  derived from the app's own.
- **02**: the test command: axe with page rules, the numeric floors, the guide's definition of
  done.
- **03**: the lint that enforces the web rules' "never" list in the consumer's check.
- **04**: the phone: out of scope until the web half ships.
