---
id: 003-178
status: done
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
- [x] With an edit to one react-ui component's `src/ui/components/<x>/` file, `vitest list --changed
  master` in `apps/showcase` lists only the story files that reach it.
- [x] With an edit to a `packages/ui-core/src/` file, or to react-ui's `src/node/`, the same command
  lists every story file; likewise `stack screens test --changed master` selects every screen.
- [x] `stack screens test --changed master` in a worktree with a committed screen edit selects that
  screen's file; with no flag it keeps today's behaviour.
- [x] `STACK_BROWSER_MB=20000 ./browser-run.sh true` exits non-zero at once, naming the cap, the
  reserve and `MemTotal`.
- [x] A run through `browser-run.sh` prints its peak; a scoped run's measured peak is recorded in the
  knowledge base's showcase section beside the full run's.
- [x] `pnpm check` passes; the full stories run (400 of 400, peak 4873 MiB) and `stack screens test --all` (180 of 180, peak 3186 MiB) pass on master `691676ae`.

## Built
- `workspaceTriggers(cwd)` in `plugins/screens/src/node/triggers.ts`, exported from
  `@fcalell/plugin-screens/node`: for each dependency of the app that resolves by realpath outside
  `node_modules`, the globs of the files under its `src/` that no source export serves (an export
  target under `./src/` serves its directory up to the segment holding a `*`), enumerated without a
  negated glob. A published app links nothing, so the list is empty.
- `apps/showcase/vitest.config.ts` and the generated `.stack/screens.vitest.config.ts` set
  `test.forceRerunTriggers` to Vitest's `configDefaults.forceRerunTriggers` plus
  `workspaceTriggers(<app dir>)`.
- `stack screens test --changed <ref>` (an optional string option; `--all` unchanged, no flag keeps
  uncommitted edits).
- `apps/showcase/browser-run.sh` refuses a cap plus reserve above `MemTotal` and prints the scope's
  `memory.peak`, keeping the command's exit code.
- Knowledge: `ui-core.md` showcase section, `commands.md`, `slot-catalog.md`; plugin-screens guide
  `screens.md` and README.
- Tests: `plugins/screens/test/triggers.test.ts` (a fixture workspace with mixed `dist` and `src`
  exports, an installed package, an absent dependency, a consumer linking nothing).

## Evidence
Probes ran in the worktree with the work committed, a temporary edit appended to one file,
`browser-run.sh pnpm exec vitest list --filesOnly --changed HEAD` in `apps/showcase`; every edit restored.
- No edit: no story file listed.
- `react-ui/src/ui/components/bar-chart/index.tsx`: 70 of 202 story files; `avatar`: 124; `chip`: 140.
- `packages/ui-core/src/cn.ts`, `plugins/react-ui/src/node/canvas.ts`, `plugins/screens/src/node/config.ts`: 202 of 202.
- Screens (`--config .stack/screens.vitest.config.ts`): a committed `ui-core` edit with `--changed HEAD~1` lists
  all 18 screen files; a committed `routes/welcome.tsx` edit, `stack screens test --changed HEAD~1`,
  runs 1 file (10 tests passed); `stack screens test` with a clean tree: "No test files found, exiting with code 0".
- `STACK_BROWSER_MB=20000 ./browser-run.sh true`: exit 1, "a 20000 MiB cap plus a 2048 MiB reserve exceeds MemTotal (15735 MiB)".
- Scoped run `browser-run.sh pnpm exec vitest run --changed HEAD` after a bar-chart edit: 39 files and 141
  tests passed (31 skipped), `browser-run: peak 4784 MiB`; recorded in `ui-core.md` beside the full run's 6.1 GiB.
- One `vitest list` probe failed once with "config must export or return an object" while loading
  `.stack/storybook.vite.config.ts` (the file `writeStorybookConfig` rewrites at each load) and passed on rerun.
