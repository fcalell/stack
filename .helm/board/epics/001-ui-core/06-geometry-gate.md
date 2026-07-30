---
id: 001-06
status: backlog
depends: [001-05]
---
# The geometry gate

## Goal

The closed geometry vocabulary ships as ui-core data, the scanner ships behind
`@fcalell/ui-core/gate`, and both UI plugins contribute a pre-phase `cliSlots.buildSteps` entry that
runs it over the app directory they own.

Driver: `docs/prd/ui-core.md` M6. Refine before running.

## Refinement notes

- Lands after 001-05, because the gate is unenforceable while primitives forward class props.
- `ts-morph` is already a repo dependency. Keeping the scanner behind a `./gate` subpath imported
  only from plugin `node/` code is what keeps "no runtime cost" literal.
- Skips any path holding a `ui/` segment. That is the only exemption, it is a fixed convention, and
  adding another is a stop-and-ask.
- Coverage is literals only. A class built from a variable, a prop, or a template literal passes
  silently, and the README says so plainly.
- Verify includes running `stack build` in helm, scaffolded before this PRD, with no edit to its
  `package.json`.
