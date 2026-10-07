---
id: 007-03
status: backlog
sessions: {}
---
# stack: the consumer's check rejects what the web rules forbid

## Goal
The web rules' "never" list (`plugins/react-ui/guide/rules.md`: a call-site class on a roster
component, a host element carrying tokens, a wrapper that re-adds a look, a local copy of a stack
component) fails the consumer's `pnpm check` instead of resting on a reading of the rules.

## Approach
Stack ships the rules with the lint preset a consumer already extends, so `stack init` and
`stack generate` need nothing new from the consumer. Each rule names the rules page section it
enforces. A rule that cannot be told from code by a lint stays a rule on the page and is listed as
such.

## Acceptance criteria
- [x] Each "never" in the web rules is either a lint rule that fails a minimal offending example
  in a scratch consumer, or listed on the rules page as unenforceable with why.
- [x] The showcase and stack's own components pass the lint.
- [x] A consumer gets the rules with no config of its own.

## Open questions
- [x] Whether Biome's plugin mechanism (GritQL) can express these rules, checked against its
  current docs, or what else the preset runs.

## Decided while building (2026-10-07), by the building session, each choice reviewed adversarially in fcalell's absence

- Biome's GritQL plugins express the mechanical "never"s; the semantic ones are listed on the
  rules page as not enforced, each with why.
- react-ui owns the web rules (`plugins/react-ui/lint/*.grit`) and contributes them through
  `cliSlots.lintPlugins`; the CLI writes `.stack/biome.json`, which the consumer's `biome.json`
  extends, so a phone app never gets web rules and a consumer writes no config.
- The rules apply to the app's own source, derived from `react.slots.routesDir`; stack's own
  components draw the looks the rules forbid a consumer, so they sit outside the scope.
- Biome 2.4 resolves a plugin path against the config that loads it, not the extended file
  (2.5.15 too), so the generated paths run through `node_modules/`.
