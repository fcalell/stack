# Design system rebuild: progress

The live state of the programme described in `kickoff.md`. Updated at the end of every session.
Nothing about the programme's state lives anywhere else.

## In flight

- Stage: 1 (Stage 0 complete 2026-09-29)
- Unit: 1 foundations, board 1 type scale (not started; needs fcalell's L1 round and the field-hairline decision below)

## Stage checklist

State per unit: `todo` · `designed` · `approved` · `built` · `done`.

### Stage 0. Clean slate and ground
- [x] 0.0 clean slate: done (2026-09-29; `pnpm check` and `pnpm -r verify` green)
- [x] 0.1 reference survey (`reference-sheet.md`): done (2026-09-29; 24 patterns, 172 cited executions, anchors by count: Linear 8, Notion 7, Vercel 6 + v0 3, Vapi 5, Twenty 5, Railway 5)
- [x] 0.2 rubric (`rubric.md`): done (2026-09-29; §0 system constants + §1 per-pattern ranges from the sheet; awaits fcalell's read)
- [x] 0.2b agents: done (2026-09-29; `design-critic`, `designer`, `implementer` in `.claude/agents/`; no third-party skill; brief §5b, §6 Done, §7, 0.2b and Stage 4 rewritten to match)
- [x] 0.3 `plugins/react`, `plugins/react-ui`, `apps/showcase` with the data-generated `Showcase`: done (2026-09-29; `pnpm check` 36 tasks green, ui-core verify 32/32; showcase rendered at `?mode=dark&density=desktop` on Inter, 2824 frames per density, 5648 cell ids; orchestrator screenshot confirmed)
- [x] 0.4 motion scale (`motion` knob 200 ms; instant 100 / fast 150 / base 200 / slow 300; cubic out/in/in-out; reduced motion zeroes the rungs), `.light` scope, fallback face named once (`fallbackFace`), roster `draws` + `states` (cells 5648 → 2264), `DESIGN.md` emitted from ui-core with `design.md lint` and a freshness test in `check`, `## Design system` block in `CLAUDE.md`: done (2026-09-29; `pnpm check` green, ui-core verify 34/34, native-ui 16/16)
- [x] 0.5 gate suite in `apps/showcase/gates/` (inventory, contrast, target-size, overflow, accessibility, states, console, motion; baselines at Stage 4): done (2026-09-29; `pnpm --filter showcase gates` 18 passed / 435 skipped "not registered" in the flake dev shell; bite test on a throwaway Button failed 7 rows; `pnpm check` green)

### Stage 1. Foundations
- [ ] type scale: todo
- [ ] colour ladder: todo
- [ ] rhythm, radius, hairlines, elevation: todo
- [ ] states sheet: todo
- [ ] port to `tokens.ts`, fixture regenerated, contrast re-run: todo

### Stage 2. Components
- [ ] atoms (17): todo
- [ ] layout (11): todo
- [ ] shared (14): todo
- [ ] content (12): todo
- [ ] native follow-through per group: todo

### Stage 3. Screens and composition
- [ ] martechthings screens (Settings, Overview, Pages + pane, Schema, login, onboarding): todo
- [ ] stead screens (three): todo
- [ ] new molecules found: none yet
- [ ] `design-language.md` rewritten: todo

### Stage 4. Lock
- [ ] Playwright baselines in CI: todo
- [ ] axe suite: todo
- [ ] promoted into `check`: todo
- [ ] build rule in `.helm/agents/`: todo

### Stage 5. Close the design loop
- [ ] `list_projects` verified the account can hold a design-system project: todo
- [ ] `@dsCard` previews generated and pushed: todo
- [ ] showcase deployed: todo

### Stage 6. Consumers
- [ ] martechthings: todo
- [ ] stead: todo

## Artboards published

| Set | Artifact URL | Source path | Last republished |
| --- | --- | --- | --- |

## Approvals

| Date | What | By |
| --- | --- | --- |

## Decisions since the kickoff

- 2026-09-29: `plugins/auth/src/client.ts` swapped from `better-auth/solid` to `better-auth/react` (`ReactAuthClient`) instead of deleted; the web plugin generates its call in 0.3.
- 2026-09-29: the kept knowledge docs, rules and READMEs had their Solid parts stripped now; React material is written at 0.3, not before.
- 2026-09-29: the CLI's tsconfig layout flag is `web` (a DOM app built by Vite: `vite` in the config), extending `@fcalell/typescript-config/web-vite.json` (DOM libs, bundler resolution, `jsx: preserve`, no `jsxImportSource`); `solid-vite.json` is gone. The split-project tests run on it. 0.3 sets the React `jsx` setting on top.

- 2026-09-29: no third-party design skill is installed and `impeccable detect` is dropped; a `designer` agent joins the critic and the implementer. `@google/design.md` stays as briefed (emitter and lint at 0.4, diff in CI at Stage 4). The brief is edited in place for every such decision; this list holds the one-line record.

- 2026-09-29: 0.3 routing is TanStack's own generator (`@tanstack/router-plugin` in the generated vite config, route tree under `.stack/`); the consumer adopts TanStack's file convention.
- 2026-09-29: the showcase is hosted by an internal consumer app `apps/showcase` (private workspace package, real `stack.config.ts` on react + react-ui); `plugins/react-ui` exports the `Showcase` page. It is the scaffold's integration test and the Stage 5 deploy target.
- 2026-09-29: 0.3 leaves the web auth client generation (`.stack/auth-client.ts` from `auth.slots.clientFlags`) and the TanStack Query app shell for the stage that first needs them (Stage 2 shared molecules or Stage 6); `plugins/react` owns them then.

- 2026-09-29: `plugins/react` shapes taken by its implementer and accepted: the `Register` augmentation lives in `.stack/routes.d.ts` (the entry is never in the type-check's program); `stack generate` also writes the route tree through `cliSlots.postWrite` (`@tanstack/router-generator`); the router plugin and `@vitejs/plugin-react` are contributed as one nested array so their order is fixed regardless of `pluginCalls`' sort; `routes: false` mounts nothing until a peer contributes a mount.

- 2026-09-29: density is toggleable in the DOM: the compact set applies under `(pointer: fine)` or `:root[data-density="desktop"]`, and `[data-density="touch"]` restores the touch set (`ui-core` `densityTokens`). `FAMILIES`, the variant registry, and the browser-safe `matrixCells` moved from `harness.ts` to `variants.ts`.

- 2026-09-29: Tailwind's duration namespace is `--transition-duration-*`; it and `--ease-*` are zeroed (eleven namespaces). A bare `duration-150` stays live like the numeric `--spacing` base; c33 keeps it out of matrices and the gate off call sites.
- 2026-09-29: the `dark:` custom variant is removed from `globals.css`: modes are token swaps, no cell may carry `:`, and a class variant would match inside a `.light` scope.

- 2026-09-29: the gates run on Playwright 1.61.1, the version the locked nixpkgs' `playwright-driver` serves (downloaded Chromium does not start on NixOS); `flake.nix` sets `PLAYWRIGHT_BROWSERS_PATH`. Bumping `flake.lock` moves both together.
- 2026-09-29: the gates' `webServer` is `stack build` + `vite preview` (same bytes every run, no dev-only console noise).

## Carried forward
- Stage 2 (Sheet, OptionList): commit `99e9a63` (another session, 2026-09-29) landed behaviour in `solid-ui` that the deletion drops and the React components must rebuild: a Sheet keeps focus when its focused control goes; a Sheet resets its blocked reason on a new page (a new `title`/`description` is a new page that has taken no input; native-ui carries this already); an OptionList stays controlled with no choice.
- **Stage 1 decision for fcalell (L1, states and hairlines board):** the contrast gate holds an unlabelled field's boundary to 3:1 (WCAG 1.4.11); the reference sheet's field hairlines (`#dfdfdf`–`#ededed` on white, ≈1.3:1) fail it. Either fields get a 3:1 edge (a darker `edge` token for controls) or the gate exempts field borders where another cue exists. The board must show both.
- The gate suite joins `pnpm check` at Stage 4; until then run `pnpm --filter showcase gates` inside `nix develop` (an open direnv shell needs a reload for the browsers path).
- Gate limits to lift when a taller frame registers: captures are the 800 px viewport (Shell, Screen exceed it); the overlay procedure (Sheet, Menu, Picker) is untested until they register; suite time grows ≈1.8 min per registered component in `contrast`, so sharding or per-component runs come before Stage 2's second group.
- Stage 2, per component: the roster's `states` lists are the 0.4 implementer's reading of each component's props (e.g. `Section` with hover/active, `Status` with focus, `Input` without disabled); each component's spec (§6 Complete 3) corrects its entry when the component is built.
- Stage 2 native follow-through: native's `--font-sans`/`--font-mono` carry a full stack, but uniwind and RN take one family; native must emit the bare family (pre-existing defect, now also naming a fallback face native never declares).
- `DESIGN.md` `components` cannot carry borders, weights, gaps or paddings (spec 0.4.0 has no fields); the file is a partial view of a cell and the matrices stay the truth.
- 0.4 contract gaps found by the showcase: (1) no light-mode scope, so a light frame inside a dark root renders dark: needs a `.light` scope restoring the light set and `color-scheme`; (2) the Inter metric-fallback face is declared by the fonts plugin but `fontStack` never names it; (3) the roster does not say which matrices a component draws nor which states apply, so the showcase carries a `DRAWS` map in `cells.ts` and renders every state for every component (5648 ids over-count): both become roster data in ui-core.
- Icons: `IconSet` ships as a type only; the consumer icon map is wired when Stage 2 builds `Icon` (a config option cannot carry React components; the old `src/app/icons.ts` convention returns then).
- Web auth client generation (`authClientSource`) and the TanStack Query app shell: not ported; owned by `plugins/react` when Stage 2 or 6 first needs them.
- `@vitejs/plugin-react` is pinned to 5.2 because 6.x needs vite 8 and moves the compiler to `@rolldown/plugin-babel`; bump vite to 8 across `plugin-vite` first (trigger: vite 8 stable in the consumers).
- zod moved to 4.6.5 workspace-wide in the lockfile (ranges unchanged): two copies ran `tsc` out of heap on the `plugin()` schema inference.
- `stack init` cannot run from a scratch directory (discovery finds no plugins); the e2e used a hand-written consumer. Worth a fix when Stage 6 scaffolds a consumer.

- Stage 4: move `design-critic` (and the rules it loads) to fcalell's nix-managed user config once the rubric is reachable from every consumer (promoted out of `research/`, or shipped in `ui-core`); until then the agents live in stack's `.claude/agents/` beside the files they load.
- 0.3: `packages/cli` scaffolds no web app until `plugins/react` exists (`FIRST_PARTY_PLUGINS` lists no web framework; `stack init` offers none).
- 0.3: `packages/typescript-config/web-vite.json` needs the React `jsx` setting (verify `react-jsx` against the React and Vite docs).
- 0.3: `.helm/knowledge/architecture/ui-core.md` keeps its web-side contract facts (the `(pointer: fine)` density override, woff2 fonts with fallback metrics, `useApiForm(...).bind` on the web); the web overlay set and `lib/reach.ts` are rewritten when `plugins/react-ui` exists.
- Uncommitted: the whole 0.0 working tree (178 deletions, 41 edits, `web-vite.json` new) awaits fcalell's commit.
