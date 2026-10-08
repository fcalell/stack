---
id: 003-178
status: todo
sessions: {}
---
# showcase, plugin-screens: a browser run checks what a change reaches, and a run that can never fit fails at once

## Goal
A batch's browser run is chosen by hand (story files picked by the agent) or is the full run
(400 stories, a 6.1 GiB peak, about one admitted at a time on a 16 GiB machine). Vitest's
`--changed <ref>` selects the test files whose import graph holds a changed file, but in this
workspace the graph is blind to part of it:

- `@fcalell/ui-core` and react-ui's `.`, `./node/*` and `./density` resolve to `dist/`, which is
  gitignored, so an edit to their `src/` is in no graph and reruns nothing: a green the change never
  earned.
- Code that runs at generate time (the theme and token CSS written to `.stack/`, the derived Vite
  configs) reaches every story through files outside git, so it is in no graph either.

`stack screens test` has the same blind spot, and its `--changed` takes only uncommitted edits, so in a
worktree whose batch is committed it runs nothing.

`browser-run.sh` waits forever for a cap that cannot fit the machine (a 10 GiB run on 16 GiB waited
until killed by hand), and nothing records what a run actually peaked at, so a scoped run's cap is
a guess.

## Approach
- **The trigger derivation** lives in `@fcalell/plugin-screens/node` (one function, used by the
  generated screens Vitest config and the showcase's roster `vitest.config.ts`): for each workspace
  package the app links (a dependency that resolves outside `node_modules` by realpath), a changed
  file under its `src/` is a force-rerun trigger unless it lies under a directory a source export of
  that package serves (react-ui's `./components/*` → `src/ui/components/`, and the other `./src/...`
  targets), which the graph sees. Derived from each package's `exports`, never listed by hand. A
  published consumer links nothing, so the list is empty there and only Vitest's defaults apply.
- **A base for scoped runs**: `stack screens test` takes `--changed <ref>` (default: uncommitted
  edits, as now; `--all` unchanged); the roster's `test-storybook` already passes Vitest's own
  `--changed <ref>` through. A batch in a worktree runs both with `--changed master`.
- **`browser-run.sh`**: refuses at once, with the numbers, a run whose cap plus reserve exceeds
  `MemTotal`; and prints the run's measured peak (the scope's `memory.peak`) when it ends, so a scoped
  run's cap is set from evidence.

## Acceptance criteria
- [ ] With an edit to one react-ui component's `src/ui/components/<x>/` file, `vitest list --changed
  master` in `apps/showcase` lists only the story files that reach it.
- [ ] With an edit to a `packages/ui-core/src/` file, or to react-ui's `src/node/`, the same command
  lists every story file; likewise `stack screens test --changed master` selects every screen.
- [ ] `stack screens test --changed master` in a worktree with a committed screen edit selects that
  screen's file; with no flag it keeps today's behaviour.
- [ ] `STACK_BROWSER_MB=20000 ./browser-run.sh true` exits non-zero at once, naming the cap, the
  reserve and `MemTotal`.
- [ ] A run through `browser-run.sh` prints its peak; a scoped run's measured peak is recorded in the
  knowledge base's showcase section beside the full run's.
- [ ] `pnpm check` passes; the full stories run and `stack screens test --all` still pass.
