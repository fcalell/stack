---
id: 001-06
status: done
merged: 34343f9
depends: [001-05]
gate:
  rounds: 2
  round-1: 11 flags (2 blocking, 5 serious, 4 nit), all fixed, none dismissed. Blocking. the
    PRD-mandated per-platform host rule had been dropped (restored as decision 3); both plugin
    fixture .gitignores would have silently untracked the gate fixtures (decision 8).
  round-2: 9 flags (1 blocking, 2 serious, 6 nit), all fixed, none dismissed. Blocking. the
    round-1 host rules made a dual consumer's shared src/ unsatisfiable, recorded as the
    split-scaffold constraint (decision 6, Flags). Serious. StackError's required code was
    unpinned; dotted-lowercase tags slipped the web intrinsic rule.
---
# The geometry gate

## Goal

The closed geometry vocabulary and the per-platform host lists ship as `@fcalell/ui-core/gate`
data, the ts-morph scanner ships behind the same subpath, and both UI plugins contribute a
pre-phase `cliSlots.buildSteps` entry that runs it over the consumer `src/` tree, skipping any
path with a `ui/` segment. The ui-core README documents the vocabulary, the escape route, and the
literals-only coverage. Driver: `docs/prd/ui-core.md` M6 (`:310-330`) plus the boundary and
gate-host bullets (`:119-149`).

## Measured facts

### The build-step machinery

- `BuildStep` is `{ name, phase: "pre"|"main"|"post", exec }` or `{ name, phase, run: () =>
  Promise<void> }` (`packages/cli/src/specs.ts:91-97`). The slot is `slot.list`, `sortBy:
  comparePhaseOrder`, `uniqueBy: (s) => s.name` (`packages/cli/src/lib/cli-slots.ts:78-83`).
- `stack build` = `generate` then resolve `cliSlots.buildSteps` then run sequentially; a `run`
  step's throw aborts the build, and later steps never execute
  (`packages/cli/src/commands/build.ts:20-45,47-58`).
- The CLI's top-level catch prints `error.stack ?? error.message` for a plain `Error` and the
  clean `log.error(error.message)` only for `StackError` instances
  (`packages/cli/src/cli.ts:187-196`). `StackError` is exported at `@fcalell/cli/errors`
  (`packages/cli/package.json:16`).
- The repo has exactly one contributor: vite's `vite-build`, phase `main`
  (`plugins/vite/src/index.ts:210-217`). Expo contributes none, and expo does not require vite, so
  a native consumer's `stack build` resolves an empty step list today: the gate becomes its first
  and only step.
- `ContributionCtx` carries `cwd` (`packages/cli/src/lib/slots.ts:91`); precedent for
  contributions reading the consumer tree: `plugins/api/src/index.ts:253-258`.

### The owned app tree and the `ui/` convention

- Web consumer app code lives under `src/` (routes at `src/app/pages`,
  `plugins/solid/src/index.ts:97-99`; `removeFiles` cleans `src/app/`, `:330`). Native:
  `DEFAULT_APP_DIR = "src/app"` (`plugins/expo/src/index.ts:28`), and native-ui's uniwind
  `SOURCES[0]` is the consumer's whole `../src` (`plugins/native-ui/src/index.ts:30-34`). No
  scaffold today distinguishes a web tree from a native tree inside one consumer.
- Nothing scaffolds a `ui/` directory. The native split tsconfig already lists `src/ui` in its
  include (`packages/cli/src/templates/tsconfig.ts:110-118`).
- The carve-out and host rules are PRD law: skip any path holding a `ui/` segment, fixed
  convention, never config (`docs/prd/ui-core.md:119-125`, `:344`); outside `ui/` "a class
  attribute is legal only on a raw host element" (`:122-124`); each plugin runs the gate "with
  the host list for its platform: lowercase intrinsics on web, `View` / `Pressable` /
  `ScrollView` / `Animated.View` on native" (`:141-144`).

### ui-core

- Eight subpath exports, no root, all raw TS (`packages/ui-core/package.json:9-18`); c02 pins the
  export list verbatim (`scripts/verify.ts:339`) and asserts `@fcalell/cli` never appears in
  `dependencies`/`peerDependencies` (`:355`). README prose counts the subpaths twice
  (`README.md:4,8`).
- Node-only precedent inside `src/`: `harness.ts` imports `node:child_process`/`fs`/`path` and is
  exported at `./harness`, marked internal in the README (`:20-22`).
- Dependencies are `class-variance-authority`, `clsx`, `tailwind-merge` only (`package.json:32-36`).
- `ts-morph ^28.0.0` lives only in `packages/cli/package.json:41`; the sole usage is the in-memory
  emit printer (`packages/cli/src/ast/ts-printer.ts:461-464`). No read-from-disk `Project` exists
  in the repo yet.
- `SPACING_RUNGS = ["room","section","stack","row","pair","gutter","card"]`
  (`src/tokens.ts:225-244`); the rhythm matrix exposes four of them as `gap-*` cells
  (`variant-tables.ts:214-224`, pinned by c27).
- The verify harness registers checks via `check(id, name, () => string)` with no expected-count
  constant (`src/harness.ts:74-96`); solid-ui's verify carries a regex class-literal scanner
  (`plugins/solid-ui/scripts/verify.ts:748-763`) used by b4 and b-resolves.
- All three packages' tsconfigs include `scripts` (`packages/ui-core/tsconfig.json:3`,
  `plugins/solid-ui/tsconfig.json:3`, `plugins/native-ui/tsconfig.json:10`). A swept fixture
  fails `tsc --noEmit` in every package, for two reasons: ui-core's `node-tsx.json` sets no
  `jsx` flag (TS17004 on any `.tsx`), and the plugin configs (solid-ui via `solid-vite.json`
  `jsx: preserve`, native-ui's own `jsx: react-jsx`) parse JSX but fail strict-mode on the
  fixtures' undeclared identifiers. Biome's file list is the negation set in
  `packages/biome-config/shared.json` (`files.includes`), and biome honors gitignore
  (`vcs.useIgnoreFile: true`).
- Both plugin fixture `.gitignore`s are `*` / `!.gitignore` / `!closure.tsx`: any new fixture
  file is silently untracked unless the `.gitignore` is amended (the exact trap M5 hit twice).

### The plugins

- solid-ui contributes 15 entries, one of them `cliSlots` (the `emitArtifact(".stack/app.css")`
  at `:308` wraps `cliSlots.artifactFiles.contribute`,
  `packages/cli/src/lib/cli-slots.ts:114-123`); it lacks the named `cliSlots` import (`:9` pulls
  only `emitArtifact`). native-ui contributes 14 by the same counting and already imports
  `cliSlots` (`plugins/native-ui/src/index.ts:4`). No `buildSteps` contributor exists besides
  vite.
- Both depend on `@fcalell/ui-core workspace:*` and on `@fcalell/cli`. Node-side code imports
  only `/derive`, `/emit`, `/tokens`, `/schema` today.
- Verify suites: solid-ui 20 checks ending b8, with graph-resolving `a*`/`b-resolves` precedent;
  native-ui 9 checks ending b7 and never builds a graph (no consumer project exists to drive it).

### sailward's scanner (prior art)

- `apps/mobile/scripts/check-classnames.mjs` (194 lines, regex, no deps): allowlist of 10 exacts
  (`flex-1 flex-row flex-wrap absolute relative min-w-0 w-full h-full overflow-hidden
  -mx-gutter`) plus 13 prefixes (`flex-[ items- justify- self- inset- top- bottom- left- right-
  z- min-h- max-w- gap-`) at `:42-68`. Host allowlist (`View`, `Pressable`, `Animated.View`,
  `ScrollView`) at `:23-28`; a class on any other tag is a host violation reported before the
  membership check. Empty skip list with a stop-and-ask comment (`:30-34`).
- The `ui/` carve-out is by omission: `SCAN_DIRS = ["src/app", "src/features"]` (`:18`), no
  exclusion mechanism. Its `layout.md:215-243` bans `flex-col` (a web-ism on RN), bare `shrink`,
  numeric dimensions, and all padding.
- Ternaries need no special handling in its model: it strips non-`cn` calls to a fixpoint, then
  every surviving string literal is a candidate (`:81-96`). Its one flaw: template-literal
  interpolations are split as junk tokens (proven on helm's `board-column.tsx:25`).
- Its prefixes admit numeric offsets and gaps (`top-4`, `gap-4`, `min-h-12`), which the M6
  sentence ("no numeric dimension") tightens away; adopting ui-core's stricter gate is a sailward
  migration, not a drop-in, and the PRD's dogfood line stays aspirational on that axis.

### helm (the live consumer)

- Links every plugin via `link:` into this repo; `"build": "stack build"`; no `ui/` directory
  exists anywhere in helm. Solid spells the attribute `class`, not `className`.
- Measured over `src/app/**` (24 JSX files): 132 distinct class tokens, 556 non-geometry
  occurrences on raw hosts and 42 on plugin components (counts drift; the close-out re-measures).
  The highest-volume structural facts sailward's RN list omits: `flex` (93), `flex-col` (48),
  `shrink-0` (~15), `overflow-y-auto` (~8), `overflow-x-auto` (5), `h-screen` (1, the app
  shell), `h-full`. Numeric gaps `gap-1`..`gap-6` throughout. One interpolated template literal
  (`board-column.tsx:25`). Genuine look on raw hosts is heavy (`text-muted-foreground` 49,
  `text-xs` 45, `text-sm` 34, `whitespace-pre-wrap` 18, 15 distinct padding tokens, 9 distinct
  `bg-*`).
- Consequence: the moment the gate lands, helm's `stack build` fails with real violations until
  helm's migration (already carried from M3/M5). The M6 verify sentence is "the gate runs there
  without any edit to its `package.json`", and a failing run naming real files satisfies it.
- Solid's `classList` prop is a class-equivalent channel (M5, probe-proven for the closure); a
  gate that reads only `class` misses `classList={{ "bg-red-500": cond }}` object keys.

## Settled decisions

1. **One shared vocabulary, shipped as data.** `GEOMETRY` lives in `src/gate.ts` as
   `{ exact: readonly string[], prefixes: readonly string[] }`, one list for both platforms.
   Exacts (38):
   - flex plumbing (7): `flex`, `flex-1`, `flex-row`, `flex-col`, `flex-wrap`, `grow`,
     `shrink-0`. `grow` is `flex-grow: 1`, sibling of `flex-1`/`shrink-0`; the defaults `grow-0`
     and bare `shrink` stay out and are named.
   - positioning (9): `absolute`, `relative`, `inset-0`, `inset-x-0`, `inset-y-0`, `top-0`,
     `bottom-0`, `left-0`, `right-0`. Offsets are the zero exacts only: a numeric offset
     (`top-4`) is a numeric dimension, banned by the same sentence that bans `gap-4`, and a
     nonzero overlay inset is component geometry that belongs in a `ui/` primitive. Negative
     forms (`-top-1`) fail by construction (no exact or prefix starts with `-`) and are named.
   - sizing (9): `w-full`, `h-full`, `h-screen`, `min-w-0`, `min-h-0`, `min-h-full`,
     `min-h-screen`, `max-w-full`, `max-w-none`. The `min-h`/`max-w` facts are the non-numeric
     members spelled out; numeric `min-h-*`/`max-w-*`/`max-h-*` stay out and are named.
   - overflow (6): `overflow-hidden`, `overflow-auto`, `overflow-x-auto`, `overflow-y-auto`,
     `overflow-x-hidden`, `overflow-y-hidden`. Exacts, not a prefix, so `overflow-visible`/
     `overflow-clip` junk stays out.
   - the seven `gap-<rung>` cells derived from `SPACING_RUNGS` (never hand-listed). Numeric
     `gap-*` is out: spacing is rungs, and the rhythm family exists for exactly this.

   Prefixes (4): `items-`, `justify-`, `self-`, `z-`. Alignment is the PRD's own category; `z-`
   is stacking order, an integer, not a length, and sailward carries it. The `justify-` prefix
   also matches the grid-only tokens `justify-items-*`/`justify-self-*`; the README says so and
   why it is harmless (they do nothing without `grid`, which is banned).

   Membership sources: every entry is in sailward's list, measured in helm, or the non-numeric
   spelling of a PRD-named fact. Three entries go past the PRD's four named sizing facts and are
   raised in Flags for the board for veto at merge: `h-full` (sailward precedent, fill chains),
   `h-screen` (the web app shell, measured in helm), and the four `overflow-*` scroll members
   (web has no ScrollView component; banning scroll plumbing would force a `ui/` wrapper around
   every scrollable pane).

   Named non-members the README lists: the grid family, `inline-flex`, `sticky`/`fixed`,
   `grow-0`/`shrink`, `hidden`/`block` display toggles (conditional render owns visibility),
   margins including `ml-auto` (`self-*`/`justify-*` cover it), all padding, numeric dimensions
   and offsets (`w-72`, `h-14`, `size-8`, `max-h-48`, `top-4`, `gap-4`), negative-prefixed
   tokens, and text-behavior classes (`truncate`, `whitespace-*`, `break-all`): look or component
   geometry, whose home is a matrix cell or a `ui/` primitive.
2. **Three unconditional bans inside any candidate token**: `[`, `(`, and `:`. Arbitrary values
   are already illegal in both spellings (README `:295-297`), and a variant prefix (`hover:`,
   `sm:`, `dark:`) on a geometry class has no legal reading, so the token as a whole is a
   violation before membership is checked.
3. **Host rule, per platform, as data.** Outside `ui/`, a class may sit only on a raw host
   element (`docs/prd/ui-core.md:122-124,141-144`). The scanner takes the platform's host rule:
   web passes the intrinsic rule (a bare identifier starting lowercase; a member-expression tag
   like `motion.div` is a component in JSX semantics regardless of case, so it fails), native
   passes `NATIVE_GEOMETRY_HOSTS = ["View", "Pressable", "ScrollView", "Animated.View"]`
   compared against the full dotted tag text, exported from `gate.ts`. The host check fires only
   on elements that carry a `class`/`className`/`classList` attribute; a class-free component is
   no violation. On a bad tag the violation names the tag and is reported before the membership
   check, matching sailward's two-message shape. `cn(...)` calls outside a class attribute have
   no host and get the membership check only.
4. **Scanner mechanics.** `scanGeometry(root, hosts)` walks `.ts`/`.tsx` under `root`, skipping
   any path whose relative segments include exactly `ui` (plus `node_modules` and `.stack`
   defensively), and parses each file with a ts-morph `Project`
   (`skipAddingFilesFromTsConfig`, syntax-only, no type checking). Candidate tokens come from:
   JSX attributes named `class` and `className` (both names on both platforms), `classList`
   object-literal keys, and the arguments of every call whose callee is the identifier `cn`,
   anywhere in a scanned file. Within those, the walk recurses through string literals,
   no-substitution template literals, both ternary branches, the right side of `&&`/`||`, array
   elements, object-literal keys (string-literal and identifier keys both), and nested `cn`
   calls. Everything else (a variable, a prop, an interpolated template, a non-`cn` or aliased
   call) passes silently. Violations are `{ file, line, kind: "class" | "host", token }` with a
   1-based line (`token` is the class for `kind: "class"`, the tag for `kind: "host"`).
5. **The build step.** Each plugin ships a named node-side function
   (`runGeometryGate(cwd: string): Promise<void>` in `src/node/gate.ts`) that dynamic-imports
   `@fcalell/ui-core/gate` (so ts-morph loads only during `stack build`, never on config load,
   `generate`, or `dev`), scans `join(cwd, "src")` with its platform's host rule (a missing
   `src/` is a pass), and on violations throws a `StackError` with code `"GEOMETRY_GATE"` (both
   plugins; the constructor's required second argument, `packages/cli/src/lib/errors.ts:3-11`;
   from `@fcalell/cli/errors`, so the CLI prints the message without a stack trace) listing
   every violation as
   `<relative-file>:<line>  <message>`, one per line: the class token verbatim for membership
   violations, the tag for host violations. The plugin's `contributes` wires it one line:
   `cliSlots.buildSteps` with `{ name: "<plugin>-geometry-gate", phase: "pre", run }`. Names are
   plugin-scoped (`solid-ui-geometry-gate`, `native-ui-geometry-gate`) because the slot is
   `uniqueBy` name and a dual consumer carries both.
6. **Scan root is `src/`; the dual consumer is recorded as unsupported.** No scaffold today
   separates a web tree from a native tree, so both plugins scan the same consumer `src/`. On a
   dual consumer the two host rules would then conflict on every class-carrying element (`<div
   class>` fails the native list, `<View className>` fails the web intrinsic rule), so a shared
   tree cannot pass both gates. No scaffold today produces a dual consumer either (solid's
   `src/app/pages` and expo's `src/app` both claim the same tree), so the conflict has no live
   instance; it is the constraint that forces the future split scaffold (`src/native/ui/**` "and
   its siblings", PRD `:121`) to give each gate its own scan root. Recorded in Flags; not this
   story.
7. **Packaging.** `./gate` joins the exports map (nine subpaths); `ts-morph ^28.0.0` joins
   ui-core `dependencies`. c02 is amended to pin the new export string and assert the ts-morph
   dependency alongside the existing no-`@fcalell/cli` rule. The README subpath prose moves to
   nine with `./gate` marked node-only, keeping harness and gate out of the contract count.
8. **Fixtures are data, swept by nothing.** Gate fixtures live in `scripts/fixture/gate/` per
   package. Both plugin fixture `.gitignore`s gain `!gate/` (and `!gate/**`) so the trees
   commit; each package tsconfig gains `"exclude": ["scripts/fixture/gate"]` so `tsc --noEmit`
   never sweeps the fixtures (ui-core has no `jsx` flag; the plugins would fail strict-mode on
   the fixtures' undeclared identifiers);
   `packages/biome-config/shared.json` `files.includes` gains `!**/scripts/fixture/gate` so
   lint/format never reshapes the line numbers the checks pin. Verify checks assert the fixture
   files exist before scanning, so a fresh clone fails loudly, never vacuously.
9. **helm goes red, deliberately.** The close-out records helm's failing `stack build` transcript
   as the proof the step arrives through the `link:` graph with no `package.json` edit. helm's
   migration stays a helm-side carried item; nothing in this story edits helm.
10. **Docs.** The ui-core README gains a gate section under the canon material: the closed
    vocabulary (exacts, prefixes, the three bans), the host rule, the named non-members, the
    escape route verbatim ("a look a call site needs is either a matrix cell or a consumer
    primitive under `ui/`, in that order"), and the coverage statement (literals only; a class
    assembled through a variable, a prop, a template literal, or an aliased/member `cn` call
    passes silently; the gate is a guardrail against drift with those open paths named; the size
    of a consumer's `ui/` directory is the number that says whether the matrices cover enough).
    Each plugin README
    gains one short paragraph naming its build step. No `.knowledge/` edits: no slot is added,
    renamed, or removed.

## Steps

1. `packages/ui-core/src/gate.ts`: `GEOMETRY` (gap cells derived from `SPACING_RUNGS`),
   `NATIVE_GEOMETRY_HOSTS`, `scanGeometry`, the violation type. Exports map + ts-morph
   dependency + README (subpath prose, gate section).
2. ui-core verify: amend c02; add a vocabulary-shape check (pinned exacts/prefixes, gap cells
   equal the rung set, no look prefix in the data) and a scanner-behavior check driving
   `scanGeometry` over the committed fixture tree exercising: a passing geometry file, membership
   violations with exact expected `{file, line, token}` triples, host violations under both host
   rules (intrinsic and native list, including a dotted-lowercase tag like `motion.div` failing
   the web rule and `Animated.View` passing the native list), the `[`/`(`/`:` bans,
   ternary/`&&`/array/object (string-literal and identifier keys)/nested-`cn`/`classList`
   extraction, a silent variable, interpolated template, and aliased-`cn` call, a `ui/` subdir
   holding a violation that is skipped, and a nonexistent root returning zero violations.
3. Fixture plumbing per decision 8: two plugin fixture `.gitignore` amendments, three tsconfig
   excludes, the biome-config negation.
4. `plugins/solid-ui`: `src/node/gate.ts` (`runGeometryGate`), the one-line `cliSlots.buildSteps`
   contribution (needs the `cliSlots` import). Verify: a graph check (precedent: `a*`) asserting
   the pre step exists and sorts before `vite-build`, plus a check executing `runGeometryGate`
   against fixture consumer trees for the PRD triple, written in the `class` spelling (plus one
   `classList` site): geometry page passes, look page throws a `StackError` naming
   file/line/token, the same look under `src/ui/` passes, and a fixture cwd without `src/`
   resolves clean.
5. `plugins/native-ui`: the same `src/node/gate.ts` + contribution. Verify executes its real
   `runGeometryGate` over its fixture tree for the same triple with the `className` spelling and
   a host violation on a non-`View` tag, and asserts in source that the contribution wires
   exactly that function at phase `pre` with the pinned name.
6. Plugin READMEs: the one-paragraph build-step note each.
7. `pnpm check` green across the repo; all three verify suites green.

## Blast radius

`packages/ui-core/{package.json, README.md, tsconfig.json, src/gate.ts, scripts/verify.ts,
scripts/fixture/gate/*}`; `plugins/solid-ui/{src/index.ts, src/node/gate.ts, tsconfig.json,
scripts/verify.ts, scripts/fixture/.gitignore, scripts/fixture/gate/*, README.md}`;
`plugins/native-ui/{src/index.ts, src/node/gate.ts, tsconfig.json, scripts/verify.ts,
scripts/fixture/.gitignore, scripts/fixture/gate/*, README.md}`;
`packages/biome-config/shared.json`; root lockfile (ts-morph hoist). No component file changes;
no `@fcalell/cli` change; no `.knowledge/` change.

## Acceptance criteria

- A1: `@fcalell/ui-core/gate` exports `GEOMETRY`, `NATIVE_GEOMETRY_HOSTS`, and `scanGeometry`;
  ts-morph is imported nowhere in `src/` outside `gate.ts`; no other `src/` module (`harness.ts`
  included) imports `gate.ts`.
- A2: `GEOMETRY` matches decision 1 verbatim; the seven `gap-*` exacts are derived from
  `SPACING_RUNGS`, not hand-listed; no exact or prefix begins with `bg-`, `text-`, `border-`,
  `p-`, `px-`, `py-`, `rounded-`, `shadow-`, or `font-`.
- A3: the scanner extracts candidates from `class`, `className`, `classList` keys (string-literal
  and identifier keys), and `cn(...)` arguments through every shape decision 4 lists, and stays
  silent on variables, props, interpolated templates, and non-`cn`/aliased calls: each proven by
  a fixture line asserted in a verify check.
- A4: a token containing `[`, `(`, or `:` is a violation regardless of membership.
- A5: a class attribute on a non-intrinsic tag (web rule, member-expression tags included) or
  off-list tag (native rule) is a host violation naming the tag; a class-free component is none;
  the intrinsic/list rules are proven by fixture cases on both, `motion.div` and `Animated.View`
  among them.
- A6: a path with a `ui` segment is skipped: a violation placed under `src/ui/` in the fixtures
  produces no report; the same file outside `ui/` produces one.
- A7: both plugins contribute pre-phase steps named `solid-ui-geometry-gate` /
  `native-ui-geometry-gate` wiring their `runGeometryGate`; the resolved web-consumer list orders
  the gate before `vite-build`; the gate module loads via dynamic import inside `runGeometryGate`
  only; both plugins' real `runGeometryGate` bodies execute in their verify suites, and a cwd
  without `src/` resolves clean in both.
- A8: the failure is a `StackError` with code `"GEOMETRY_GATE"` in both plugins, whose message
  lists each violation as `<relative-file>:<line>  <message>` with a 1-based line and the token
  or tag verbatim, all violations in one run, never fail-fast on the first.
- A9: the PRD verify triple holds in fixtures on both plugins: `flex-1 items-center` on a raw
  host passes, `flex-1 bg-canvas` fails naming the file, the line, and `bg-canvas`, and the same
  class under `src/ui/` passes; the solid-ui fixtures spell the attribute `class`, the native-ui
  fixtures `className`.
- A10: the ui-core README carries the vocabulary as a closed list, the host rule, the named
  non-members, the escape route, and the coverage statement from decision 10; c02 pins nine
  subpaths and the ts-morph dependency.
- A11: the gate fixture trees are tracked by git (`git ls-files` shows them), excluded from all
  three tsconfigs, and ignored by biome; every fixture-driven check fails if its fixture file is
  missing.
- A12: ui-core, solid-ui, and native-ui verify suites pass; `pnpm check` passes.

## Run plan

One worktree run (`story/001-06`), Conventional Commits, ui-core first then the two plugins.
Reviews run sequentially (M5 lesson): spec-vs-criteria first, standards-vs-rules second, never in
parallel on one worktree.

Close-out (mine, at merge): re-run all suites and `pnpm check` from the real checkout; at least
two guard mutations (a look class added to a passing fixture must fail the plugin check; a look
class added to `GEOMETRY` must fail the shape check); the live PRD verify with the means that
exist: a scratch consumer in the scratchpad wired like helm (`link:` deps) for the
pass/fail/carve-out triple under a real `stack build`, then `stack build` in helm recording the
failing transcript (re-measured violation count, sample lines) as the no-wiring proof, plus a
`stack generate`/`stack dev` spot-check that ts-morph stays off those paths. The native
on-device half stays owed to the first native consumer (standing M4 reduction).

## Out of scope

- helm's migration onto the vocabulary (helm-side, carried since M3/M5).
- Per-file skips, gate configuration, or any second exemption (non-goals; stop-and-ask).
- Scanning `as`-polymorphism, consumer CSS, `style` props, or non-literal classes (named open in
  the README).
- The split-consumer scaffold and per-platform scan roots (no scaffold exists to follow).
- M7's matrices, ground tables, and look pass.

## Run record

One worktree run, 6 commits (`bbde4be`..`a4c7730` after the seat reorder), plus one seat commit
(`34343f9`). Sequential reviews per the run plan:

- Spec review: all A1-A12 met, zero blocking or serious. The three run-reported deviations judged
  faithful (`GeometryHosts` sentinel; host violation suppressing membership on that element,
  **ratified at the seat**: the class channel is wholesale illegal on a bad host, one violation
  per element; root-relative `file` with the plugins prefixing `src/`). Nits: native b8's fixed
  240-char source window (hardened at the seat to the closing brace).
- Standards review: one serious, the fixture commit preceded its tsc/biome fencing so `pnpm
  check` was red at that intermediate (fixed by reordering the fence commit ahead via
  cherry-pick rebuild; hashes changed). Nits: the duplicated violation formatter (hoisted to
  `formatViolations` on the gate subpath at the seat; both plugins' pinned-message checks guard
  the shape), the README "not a sandbox" contrast (recast per the writing playbook; decision 10's
  phrasing follows the shipped sentence), and two `@xmldom/xmldom` deprecation-metadata lines in
  the lockfile beyond the ts-morph hunks (accepted knowingly; registry-metadata refresh).

## Close-out (at merge, from the real checkout)

- Suites: ui-core 28/28, solid-ui 22/22, native-ui 11/11; root `pnpm check` clean over 278
  files. The branch merged fast-forward `1d00a24` → `34343f9` (32 files, +975/−14).
- Guard mutations, both caught: `bg-canvas` added to the passing web fixture → b10 FAIL;
  `shadow-1` added to `GEOMETRY` exacts → c29 FAIL. Both restored, suites green again.
- Live PRD triple in a scratch consumer (helm's shape, absolute `link:` deps, in the session
  scratchpad): `flex-1 items-center` on a raw host → full `stack build` completes through
  vite-build; flipped to `flex-1 bg-canvas` → exit 1, the transcript reads
  `src/app/pages/index.tsx:2  "bg-canvas" is not in the geometry vocabulary` with the clean
  StackError print and vite-build never runs; the same class under `src/ui/look.tsx` → build
  completes.
- helm, no `package.json` edit: `stack build` fails in the pre step with **497 violations (472
  vocabulary, 25 host)**, e.g. `src/app/components/activity-pane.tsx:46  "rounded-md" is not in
  the geometry vocabulary` and `class attribute on non-host tag "Button"`; `stack generate`
  exits 0 and helm's tree stays clean. The step arrived purely through the `link:` graph.
- The native on-device half stays owed to the first native consumer (standing M4 reduction).

## Carried forward

- helm's migration, now measured: 497 gate lines to clear before its `stack build` is green
  (helm-side, carried since M3/M5).
- ~~The three flagged vocabulary members (`h-full`, `h-screen`, the `overflow-*` scroll set)
  shipped as decided; each is a one-line removal if vetoed.~~ **Vetoed and removed** (`1a3534c`):
  the vocabulary is 31 exacts, sizing carries only the PRD's non-numeric facts, overflow keeps
  `overflow-hidden` alone. helm's migration grows by its ~14 measured scroll/height lines.
- `packages/biome-config/shared.json`'s `!**/.claude/worktrees` glob makes the root `pnpm check`
  lint leg exit 1 inside any worktree (0 files matched). Pre-existing; joins the M5 biome-config
  carried item as one real fix.
- The dual-consumer host-rule conflict stands as the constraint on the future split scaffold
  (per-platform scan roots).
- The gate's silent paths (variables, props, interpolated templates, aliased `cn`) and the open
  holes (`as`, consumer CSS, native `style`) are documented in the README; the consumer's `ui/`
  directory size is the coverage meter.

## Open questions

None blocking; the gate rounds added none that survived.

## Flags for the board

- Three vocabulary members go past the PRD sentence's four named sizing facts: `h-full`
  (sailward precedent, fill chains), `h-screen` (the web app shell, measured once in helm), and
  the four `overflow-*` scroll members (web has no ScrollView component; without them every
  scrollable pane needs a `ui/` wrapper). Vetoable at merge; the vocabulary data makes removal a
  one-line change each. **Resolution: all three vetoed by the board and removed in `1a3534c`.**
- The gate is stricter than sailward's own scanner (numeric offsets, numeric gaps, and numeric
  `min-h-*`/`max-w-*` all fail here and pass there), so the PRD's "drop-in for sailward" line
  holds for the boundary, not the list. Sailward adopting it is a migration.
- helm's `stack build` goes red when this lands and stays red until helm migrates (carried).
- A dual (web plus native) consumer cannot pass both gates over a shared `src/`: the two host
  rules contradict on every class-carrying element. No scaffold produces a dual consumer today,
  so nothing breaks now; the future split scaffold must give each gate its own scan root
  (decision 6).
