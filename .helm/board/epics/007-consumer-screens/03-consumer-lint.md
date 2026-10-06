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
- [ ] Each "never" in the web rules is either a lint rule that fails a minimal offending example
  in a scratch consumer, or listed on the rules page as unenforceable with why.
- [ ] The showcase and stack's own components pass the lint.
- [ ] A consumer gets the rules with no config of its own.

## Open questions
- [ ] Whether Biome's plugin mechanism (GritQL) can express these rules, checked against its
  current docs, or what else the preset runs.
