# Design system rebuild: progress

The live state of the programme described in `kickoff.md`. Updated at the end of every session.
Nothing about the programme's state lives anywhere else.

## In flight

- Stage: 1 (Stage 0 complete 2026-09-29)
- Unit: 1 foundations, the four boards approved by fcalell (2026-09-29, round 2); the Stage 1 port landed (ui-core verify 32/32, native-ui verify 16/16, `pnpm check` 36/36); awaiting fcalell's sign-off on the rendered showcase foundations page (`/foundations` in apps/showcase), then Stage 2 starts with the atoms

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
- [x] type scale: approved (round 2, `plugins/react-ui/design/01-type-desktop.dc.html` 1280 frame, `01-type-touch.dc.html` 390 phone frame)
- [x] colour ladder: approved (round 2, `02-colour.dc.html`)
- [x] rhythm, radius, hairlines, elevation: approved (round 2, `03-rhythm.dc.html`; field boundary B)
- [x] states sheet: approved (round 2, `04-states.dc.html`; accent primary)
- [x] port to `tokens.ts`, fixture regenerated, contrast re-run: built (2026-09-29; `tokens.ts`, `schema.ts`, `derive.ts`, `emit.ts`, `cn.ts`, `gate.ts`, `design-md.ts`, the text cells and the carried matrices rewritten; ui-core verify 32/32 with the sheet as the oracle, c11 sweeping 360 hues, c32 124 pairs; `DESIGN.md` re-emitted, lint 0 errors; react-ui codegen on the new emitters; native-ui carried, verify 16/16; `pnpm check` 36 tasks green; showcase gates 18 passed / 435 not registered)
- [ ] sign-off on the rendered showcase foundations page: built (`plugins/react-ui/src/ui/showcase/foundations.tsx`, route `/foundations`; exports `plugins/react-ui/design/showcase-foundations.{light.desktop,dark.desktop,light.touch}.png`); awaits fcalell

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
| Foundations (L1) | https://claude.ai/artifact/G1P4k7pv6eVnHBJwQF1uc7 | `plugins/react-ui/design/` (`foundations.css` + five `.dc.html`; publish = copy to the artifact root, stylesheet href and font urls rewritten to the uploaded assets) | 2026-09-29, round 2 |

## Approvals

| Date | What | By |
| --- | --- | --- |
| 2026-09-29 | L1 round 1 decisions: the default primary act is the accent fill; the field boundary is B (the reference hairline, ≈1.3:1, a visible label as the cue; the contrast gate exempts a labelled field's border) | fcalell |

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

- 2026-09-29 (fcalell, supersedes the first Stage 1 setup): Stage 1 is designed from scratch on `plugins/react-ui/design/foundations.css`, a token sheet the designer writes (named custom properties, the two font faces from `./files/`, a minimal base); boards use its names only. Kickoff decision 6 and the Stage 1 section are edited to match; the Tailwind compile of the showcase's `app.css` for boards is dropped (`pnpm --filter @fcalell/plugin-react-ui design` only copies the two latin woff2 files to the gitignored `design/files/`). The port rewrites `tokens.ts` and the type cells to emit the approved sheet.
- 2026-09-29: L1 round 1 critic verdict after two rework passes: no blockers, no bans; open for fcalell: (1) the default primary act, accent fill or ink fill (board 4 draws both; the settings card on board 3 uses accent while the §1 settings row asks for a dark primary); (2) the field boundary, A `edge-strong` at 3:1 or B the reference hairline at ≈1.3:1 (board 3); (3) whether the §2 measure 45–75 ch applies to a phone column (touch body 16 in a 358 px column gives 33–39 cpl); (4) the keep-list numbers the critic flagged as nits: title 16/600 · heading 14/600 · label 13/500 one to two px apart; light ink-meta vs ink-faint 8.7 L* apart; accent vs accent-ink 2.2 L* apart; dark canvas→surface +3.6; table header 12/400; dark popover with shadow + hairline; press at 100 ms; hover wash at 4 %; the bright dark chip marks and the maroon light pink.
- 2026-09-29 (fcalell, L1 round 1): type roles follow two rules: size follows structure, never emphasis (the primary line of anything is `body`, a secondary line is `meta`, emphasis inside a line is weight 500, never a size change) and a size role names a place once (`title` the page's name, once per screen; `heading` a section's or card's name, never inside a row; `caption` text inside a small component, never a sentence; `code` what a machine reads). `label` is no longer a size role (body at 500); menus and pickers draw their label at body; table headers are meta at 500. Desktop sizes 36 · 18 · 15 · 13 · 12 · 11 (title 18/600, heading 15/600).
- 2026-09-29 (fcalell): `ink-faint` is disabled-only (WCAG exempt, ≈3:1); placeholders use `ink-meta`. `accent-ink` equals `accent` in light and lightens only in dark. Dark surface steps +4.5 L* over canvas. Hover wash 5 %. Press stays 100 ms (rubric §6: 150–300 is for what moves; feedback may be shorter). Chip marks: dark capped at L 0.75, light floored at L 0.50; the real dataviz validator runs at the port. The dark popover keeps shadow + hairline. The phone column is exempt from the 45–75 ch measure (rubric §2). The rubric's picker label 11–12 and the settings "dark primary" are amended to dialects, not rules.
- 2026-09-29 (fcalell): the Stage 1 port keeps the derivation as internal structure (one base per scale, the sheet's constants as the calibration, native-ui reads the same numbers) and cuts the consumer knobs to `density`, `defaultMode`, `fonts` and one `accentHue`. Dropped: `primary` (the ink act becomes a component variant), `elevation`, `radius`, `space`, `text`, `motion`, `neutralHue`, `neutralChroma`, `okHue`, `warnHue`, `dangerHue`, `overrides`; `widths` and `breakpoints` become constants. The port adds a hue-sweep check that every accent-derived pair keeps its contrast at any `accentHue`. The consumers' current theme options go with their Stage 6 rewrite.
- 2026-09-29 (fcalell): tokens are enforced by ownership, from Stage 2 on. A token names a place, a relation or a role, and the primitive that owns it draws it: type roles other than body/meta are drawn only by their owning molecules (`Text` exposes body and meta plus strong; title by Page/Screen, heading by Section/Card, caption by Chip/Kbd, code by Code, display by Stat); colour only through closed tone/family/index/variant props and the surface molecules; vertical spacing only through `Stack between` / Section / Form / Page (the gate's gap allowlist shrinks to `inside` and `pair`); radius, hairline, shadow, density geometry and motion never in consumer code. Each roster entry declares the roles, tones, radius, elevation and spacing it may draw, and one ui-core verify walks every matrix against it; the rules of use become rubric §2 tells (one title per screen, no heading in a row, no caption sentence, meta never a region's only text). `DESIGN.md` carries the same facts in its component entries where the spec has a field and as prose in the Typography section.
- 2026-09-29 (round 2 critic): one rework, the settings title 18 vs the settings row's 15–16, resolved in the rubric (a settings page uses the system's title role). Dark status tones then capped with the chip marks (ok L 0.64, warn 0.75, danger 0.71) so the trio keeps CVD separation ≥ 8; hover vs selected is 4.87 L* apart in light (accepted). Dark `--edge-raised` #34363a sits 0.7 L* past the #34343a ceiling (accepted, noted in the sheet).
- 2026-09-29: the sheet's mechanics settled by the critic's gates: no colour transition (only transform and opacity animate); a `::before` hit box gives every part `--target-min` (24 desktop, 44 touch); the dark hairline is two tokens (`--edge` over canvas and surface, `--edge-raised` inside group and lifted layers, re-pointed by the container); the label element inside act, chip, row and menu item is mandatory for truncation.
- 2026-09-29: a board is one `.dc.html` file, valid standalone (links `./foundations.css`) and a Design-canvas artboard as written; the publish copies it to the artifact root and rewrites the stylesheet href and the font urls to the uploaded assets. Density is a root attribute, so a board that spans densities is two files.

- 2026-09-29 (Stage 1 port, orchestrator's shapes): the sheet's names are the contract's (`ink-body`/`ink-meta`/`ink-faint`, `accent-ink` for the old `tint`, chip families by hue name each with `-soft` and `-ink`, avatars with `-ink`, `raised`, `edge-raised`, `edge-strong`, `on-danger`, the six washes, the six place aliases, the two act fills with their states, the switch's five; 83 colours, no invariant set, every one per mode); the sheet's `color-mix()` values are declared as `veil` (a role at an alpha) and `mix` (OKLab toward a role or black) and emitted as literals both platforms parse; `accent-ink` carries `holds` contracts (4.5:1 on `group` and `accent-soft`) that move its lightness at hues where the declared one falls short (green, 4.40 on group), and every accent value's chroma is clamped inside sRGB at its lightness; the default `density` is `desktop` (the sheet's own default; touch seeds `@theme` for native, the desktop set rides `(pointer: fine)`); density moves the type scale, the eight spacing roles and sixteen sizes through the same `@layer base` cascade as before; shadows are per mode and read through `var(--shadow-<level>)` in the `@utility`, so `modeTokens` returns full property names and both codegens stopped prefixing; the hairline, ring and light shadows sit on `:root` via `rootTokens`; the 800 ms loop is `--transition-duration-loop`, kept under reduced motion; widths are `popover`/`toast`/`dialog`/`sheet`/`measure` (66ch); the old `reference.css` calibration is deleted and `foundations.css` is the verify oracle by workspace path; the carried (non-text) matrices are renamed onto the vocabulary and stay old-design until Stage 2 replaces each from its artboard.

- 2026-09-29: the emitted `app.css` carries every contract utility whether or not a source spells it (react-ui contributes `@source inline()` patterns built from the token lists: colours as fill/ink/border/outline, spacing roles as paddings/gaps/widths, sizes as heights/widths/minimums, widths, type roles, tracking, radii, shadows, durations, easings). Reason: a Stage 2 artboard is drawn on the emitted sheet in contract classes before any component spells them, and the foundations page builds its classes from the names; the cost is the whole contract in every consumer's sheet (the showcase's CSS is 42 kB, 7.5 kB gzip). `COLOR_GROUPS` is the colour list by group as data. A `switch-inset` size (2 px) joined `SIZES` from the sheet.

## Carried forward
- Touch secondary sizes (meta 15, caption 14 under body 16) were a critic nit; ported as approved, revisit if a Stage 2 phone board shows them too close.
- Stage 2 components must enforce the label element inside act, chip, row and menu item (a bare text node cannot be truncated); the light `edge-raised` equals `edge`, so a hairline inside a light group tile is 3.5 L* from its fill; the selected wash sits within 1 L* of the hairline, so a selected row swallows its splits; the `local()` metric fallback face resolves to nothing on this NixOS Chromium (no Arial/Liberation), so the fallback path is unverified here.
- Stage 2 (Input): the FIELD matrix has no `hover` or `disabled` cell; the foundations page composes them from `edge-hover` and `fill-disabled`/`ink-disabled` until the Input artboard adds the cells.
- Stage 2 rewrites the carried matrices (BUTTON, FIELD, ROW, CHIP, …) from their artboards; until then they are old-design cells on the new names and the roster's `draws` is unchanged. The ownership data (roles, tones, radius, elevation, spacing per roster entry) and its verify land with the first Stage 2 group.
- Native follow-through of the port (2026-09-29, native-ui verify 16/16): two contract notes for Stage 2. (1) Sizes share the `--spacing-*` namespace (Tailwind's `min-h-*` reads nothing else), so `gap-row` compiles to the row height and cannot be retired by the reset; the gate keeps every gap but `inside`/`pair` off call sites, and a cell never spells one. (2) A React Native `Text` inherits no colour from its `View`, so the `CHIP` and `AVATAR` cells' `text-chip-<family>-ink` / `text-avatar-<n>-ink` on the container do not reach the native label; the Stage 2 chip and avatar artboards split the ink into a label cell (as `BUTTON_LABEL` does) so both platforms draw it. `Chip.family` now takes the family names (`red` … `pink`), a consumer-facing change the Stage 6 rewrite absorbs.
- The `design.md lint` reports 58 warnings, 0 errors, on the re-emitted `DESIGN.md`; the errors are the gate.
- Stage 1 boards: the designer's screenshots (`plugins/react-ui/design/*.png`) are the artboard exports Stage 2 compares showcase cells against; the critic's are under the gitignored `.playwright-mcp/`.
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
