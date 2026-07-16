# PRD — Deploy engine: reconcile, lock, gates, ordered run, TUI

Source: audit of `sailward/tools/release`, an Ink TUI release cockpit for a live app on stack's
target (Cloudflare worker, OTA, web, native). Compared against `stack deploy`, which today builds,
resolves `deployChecks` + `deploySteps`, prints a plan, confirms, then runs every step linearly.

This PRD lifts the product-agnostic release machinery sailward proved into the CLI's deploy path. It
does not port sailward's bespoke fleet/native/ota dashboard, and it does not touch the OTA domain
(that is [`plugin-native-updates`](./plugin-native-updates.md), which consumes the surfaces this PRD
adds).

## Scope

**In:**

- Reconcile before deploy: report what actually needs deploying and skip targets already live.
- Deploy lock: one deploy at a time per repo.
- Blocking gates: let a `deployChecks` contribution veto the deploy, not only inform.
- Ordered run with stop-on-failure across steps.
- A terminal UI for the run, extracted as a reusable engine, with a non-TTY fallback to the current
  linear logs.

**Out:**

- The fleet/native/ota dashboard, recommendation engine, and OTA bundle operations. They stay in
  sailward or move to `plugin-native-updates`.
- Native store builds (EAS). That is `plugin-expo`'s deploy surface.
- A `stack dev` TUI rewrite. The engine is built so `dev` can adopt it later (milestone 6), but the
  `dev` port is not in this PRD's acceptance.
- Multi-repo orchestration. Scope is one consumer app.

## Surfaces touched

- `packages/cli/src/commands/deploy.ts`: reconcile, lock, gate enforcement, ordered run, TUI render.
- `packages/cli/src/specs.ts`: extend `DeployCheck` with a blocking verdict; add a `DeployStatus`
  probe spec; give `DeployStep` an optional target key so reconcile can skip a step.
- `packages/cli/src/lib/cli-slots.ts`: new `cliSlots.deployStatus` list slot.
- New `packages/cli/src/lib/tui/`: the run engine, ported from sailward's `run.tsx`, `term.ts`,
  `logs.ts`. Internal to the CLI, not a plugin surface, so it adds no `stack.config.ts` option.
- `packages/cli/package.json`: add `ink` and `react` (the deliberate weight this PRD accepts).

The run engine consumes exactly the events the deploy loop already produces (plan, step-start, line,
step-done). Porting it swaps the renderer, not the plugin contract.

## Milestones

Ordered by dependency. Each is independently shippable and verifiable.

### M1 — Run-engine TUI, wired to `stack deploy`

Port `term.ts` (terminal-size hook), `run.tsx`'s `useRun` + `RunView` (steps with
pending/active/done/failed status, an 80 ms-coalesced log tail, elapsed timer, abort on ctrl+c,
outcome banner), and `logs.ts` (per-run log files plus prune) into `packages/cli/src/lib/tui/`.
Strip every sailward-specific type; the engine is driven by the generic event sink only. Wire
`runDeploySteps` to emit into it. When `process.stdout` is not a TTY, fall back to the existing
`@clack/prompts` step logs unchanged.

**Test.** Unit: the sink reduces a scripted event stream to the expected step states and tail.
Deploy integration: a run against stub steps renders the outcome banner on success and on a failing
step; with a piped (non-TTY) stdout, output matches the current linear format.

### M2 — Deploy lock

One deploy at a time. Port `release-lock.mjs`'s file-lock idea: acquire a lock file at deploy start
keyed on pid, refuse a second deploy with the holder's pid, release on exit. `plugin-db` already
holds a migration lock during teardown; this is the repo-wide deploy lock above it.

**Test.** Integration: a second `deploy` while a stub deploy holds the lock exits non-zero naming
the holder; the lock clears after the first finishes and a later deploy proceeds.

### M3 — Blocking gates

Let a check refuse the deploy. Extend `DeployCheck` with a verdict: a check returns `blocking` with
a reason, and the deploy aborts before any step runs. Informational checks keep today's shape. This
gives the shipped destructive-migration gate (`plugin-db`'s `deployChecks` contribution) a graceful
blocking verdict instead of its current throw-to-abort.

**Test.** Integration: a check returning a blocking verdict aborts the deploy before steps run and
prints the reason; a non-blocking check still runs its `action` and proceeds.

### M4 — Reconcile before deploy

Report drift and skip live targets. Add `cliSlots.deployStatus`: each deploy target contributes a
probe returning `{ target, needsDeploy, detail }`. Sailward derives this from a git tag per target
(`released/<leg>`) compared against the current commit plus pending migrations
(`verify.ts` `needsRelease`); adopt the same released-marker mechanism. `stack deploy` resolves the
probes, renders per-target status, and skips a `DeployStep` whose target reports `needsDeploy:
false`. A step with no matching probe always runs, so this is additive.

Open design question to settle in the milestone: the released-marker store. Git tags (sailward's
choice) keep it in the repo and need no extra binding; a KV marker avoids tag noise. Default to git
tags unless the milestone surfaces a blocker.

**Test.** Integration: a target whose marker equals the current commit is reported current and its
step is skipped; a target ahead of its marker, or with pending migrations, is reported and runs.
Deploy writes the marker only after the step succeeds.

### M5 — Ordered run with stop-on-failure

Make order explicit and stop on the first failure. Today `deploySteps` sort by phase
(`pre`/`main`/`post`); sailward enforces a strict leg order (`worker → ota → web → …`) and halts the
chain on any failure so a later target never ships against a half-broken earlier one. Add explicit
ordering within a phase and stop-on-failure semantics to the run loop.

**Test.** Integration: steps run in the declared order; a failing step halts the remaining steps and
the outcome banner names the failed step.

### M6 (follow-up) — `stack dev` multiplexer on the same engine

Reuse the run engine for `stack dev`'s parallel processes (per-process status, ready state, restart
count, log tail), replacing the current interleaved prefixed stdout. This retires the need for an
external multiplexer like mprocs in a stack consumer. Not part of this PRD's acceptance; recorded so
the engine's shape stays compatible.

## Non-goals

- No new consumer-facing `stack.config.ts` option. The engine is internal; reconcile markers and the
  lock are automatic.
- No domain types in the deploy engine. Target identity comes from plugin-contributed probes.
- No dashboard, no recommendation line. A single run view, not sailward's continuous fleet reconcile.

## Acceptance

Per milestone: implementation plus co-located tests land, tests drive the real command path (no
string-only assertions), `pnpm test` and `pnpm check` pass. The dogfood signal for the PRD as a
whole: sailward could replace `tools/release`'s run/lock/gate/order machinery with `stack deploy`,
keeping only its product-specific dashboard.
