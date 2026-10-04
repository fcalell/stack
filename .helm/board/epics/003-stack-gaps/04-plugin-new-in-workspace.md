---
id: 003-04
status: backlog
sessions: {}
---
# cli: stack plugin new inside the checkout links the workspace

## Goal
`stack plugin new` scaffolding into `plugins/<x>` inside stack's checkout writes `github:` specs
and its own `pnpm-workspace.yaml` (`packages/cli/src/commands/plugin.ts`), so the plugin installs
stack from GitHub instead of this checkout. `stack init` already detects the workspace (002-03).

## Approach
Reuse init's workspace mode (`stackWorkspaceRoot`, `toWorkspaceSpecs` in
`packages/cli/src/lib/install.ts`).

## Acceptance criteria
- [ ] (test) a plugin scaffolded inside the workspace gets `workspace:*` specs and no `pnpm-workspace.yaml`.
