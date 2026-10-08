---
id: 003-184
status: backlog
sessions: {}
---
# showcase: browser runs drop the memory budget once Stead admits stack's jobs

## Goal
`apps/showcase/browser-run.sh` admits a browser run when the machine's available memory covers its
cap and a reserve, holds it to that cap in a `systemd-run --user` scope, and prints its peak. That is a
job scheduler's work, and it serves only the terminal agents that build stack today. When Stead runs
stack's lifecycle, its boundaries hold each command to a fixed `MemoryMax` and its scheduler admits
jobs. Inside a Stead boundary the script also breaks: there is no user systemd manager, and `/run`
is empty, so the shared claims directory spans no other job.

Blocked on Stead: its first stack job runs under a scheduler that admits by machine memory (the
design question put to Stead: slots times the job kind's `MemoryMax` plus a reserve within
`MemTotal`).

## Approach
- Delete `apps/showcase/browser-run.sh`; the showcase's `test-storybook` is `vitest run` and
  `test-screens` is `stack screens test`.
- The knowledge base's showcase section (`.helm/knowledge/architecture/ui-core.md`) drops the budget
  paragraph and keeps the measured peaks as the figure Stead's job kind is sized by: a full stories run
  peaks between 4.8 and 6.1 GiB, a screens run near 3.2 GiB.
- `maxWorkers: 2` in the roster's Vitest config stays: it bounds one run's renderers whatever admits
  it.
- What stays from 003-178: `--changed <ref>` scoping, `workspaceTriggers`, the atomic config write.

## Acceptance criteria
- [ ] No file under `apps/` or `.helm/` names `browser-run.sh`, `STACK_BROWSER_MB` or
  `STACK_BROWSER_RESERVE_MB`.
- [ ] A Stead job on stack runs the scoped stories run and `stack screens test --changed <default
  branch>` green inside its boundary.
- [ ] `pnpm check` passes.
