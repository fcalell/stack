# Design system rebuild: kickoff brief

Written 2026-09-29 from a research conversation in the martechthings repo. This file is the whole
context a fresh session needs to start the programme: the goal, what exists, what was verified,
what was decided, the plan with its refinement loops, how the work is run, and how progress is
tracked. `progress.md` beside it is the live state; this file is the fixed brief.

## Opening prompt for the first session

```
Read /home/fcalell/projects/stack/.helm/research/design-system/kickoff.md in full, then
progress.md beside it. You are the orchestrator of this programme. Start with Stage 0.0 (the clean
slate). Before each stage, re-read its section here. Never carry state in chat that is not in
progress.md.
```

## 1. Goal and standard

A beautiful, complete, production-grade design system inside `@fcalell/stack`, used by every
fcalell app (martechthings, stead, sailward's successor on stack), on the web in React and on
native in React Native, over one framework-free contract (`packages/ui-core`).

The standard is the craft of the best product UI on Mobbin, measured, not the two apps the old
roster assumed. Every visual decision is made against a rendered screen, compared to a reference,
and locked by a test. Nothing ships unseen.

Three words are defined in §6 so every session judges the same way: **complete** is an inventory
a script counts, **done** is a set of machine gates with exit codes, **beautiful** is a judged
rubric with numeric tells, run by a critic agent before fcalell looks. The definitions were
derived on 2026-09-29 from a survey of the design-system tooling in the Claude ecosystem (§5b).

## 2. What exists today (verified 2026-09-29)

Repo `~/projects/stack`, pnpm monorepo. Sibling consumers: `~/projects/martechthings` (web,
Cloudflare, `stack.config.ts` at root, ~2,600 lines of app tsx), `~/projects/stead` (web, Node
target, `packages/server/stack.config.ts`, ~4,900 lines), `~/projects/sailward` (native, Expo +
React Native + uniwind, hand-built, not on stack; the future native consumer).

| Package | Role | Fate |
| --- | --- | --- |
| `packages/ui-core` | framework-free contract: tokens (`tokens.ts`), derivation (`derive.ts`), emit records (`emit.ts`), cva variant matrices (`variant-tables.ts`, `variants.ts`), the roster (`roster.ts`, 54 components), descriptors, the geometry gate (`gate.ts`), the verify harness (`harness.ts`) | keep; recalibrate |
| `packages/cli` | `defineConfig`, plugins, slot graph, codegen, the `stack` CLI | keep |
| `packages/typescript-config`, `packages/biome-config`, `packages/auth-testing` | presets | keep; drop the `solid-vite` preset |
| `plugins/api`, `auth`, `db`, `cloudflare`, `vite`, `node`, `expo` | server and build plugins | keep; `auth` and `vite` have Solid-specific client code to replace |
| `plugins/solid`, `plugins/solid-ui` | SolidJS compile, routing, bootstrap; the web design system in Solid + Kobalte + Tailwind v4 (66 files, ~5,700 lines) | retire, replaced by `plugins/react` and `plugins/react-ui` |
| `plugins/native-ui` | React Native 0.85 + Expo + uniwind rendering of the roster (65 files, ~4,000 lines) | keep; realign to the new contract |

The contract's shape, which the rebuild keeps: closed token list emitted as a Tailwind v4 `@theme`
block with nine namespaces zeroed so off-contract utilities compile to nothing; knobs (six hues and
chroma, `primary`, `space`, `radius`, `text`, `elevation`, `density`, `fonts`, `widths`,
`breakpoints`, `defaultMode`) derived into OKLCH light and dark values; density as a theme
(`touch` 44 px floor, `desktop` 32 px under `(pointer: fine)`); variant matrices holding only
platform-invariant cells; interaction states as platform overlays; one prop name per concept,
`className`/`style` closed as `?: never`; the geometry gate as an allowlist over consumer code at
build time; verify suites (27 in ui-core, 22 in solid-ui, 14 in native-ui) run only by hand via
`pnpm verify`.

What does not exist, and is the root cause of the current look: nothing renders a component. No
showcase, no screenshot, no visual test, no docs site, no images anywhere in the repo. Every check
is static: CSS compiles, ts-morph scans, contrast math.

## 3. The diagnosis (why it looks unfinished)

Measured on martechthings' running app on 2026-09-29:

| Symptom | Cause |
| --- | --- |
| Clunky letterforms | no `fonts.sans`; falls to `ui-sans-serif, system-ui`, which is DejaVu Sans on Linux |
| Fields, groups, pickers, buttons are one flat grey slab; inputs read as disabled | `elevation: "flat"` removed depth and nothing replaced it: fields take the `group` fill (L 0.935) with no border |
| Every input is a pill | `radius` default 14 px on 32 px controls |
| Section labels float as stray captions | `Section` header is 13 px meta ink with no hairline and no rhythm |
| 16 px text inside 32 px rows, 28 px bold titles | `density: "desktop"` shrank the boxes; `text: 16` kept the touch type scale |
| Three greys within 0.07 L | with hairlines gone, lightness is the only separator and the steps are too close |
| Browser resize grip on textareas | never styled |
| A 720 px column pinned top-left of a 1,800 px main with no brand, no centring | molecules own their interior; no molecule owns the page |

None of these is a framework property. They are token values, missing treatments, and the absence
of a visual loop. The framework decision below is about tooling and platform unity, not about
looks.

## 4. Decisions (settled; not to be reopened without fcalell)

1. **React on the web.** `plugins/react` (routing and bootstrap) and `plugins/react-ui` (the roster
   in React) replace the Solid plugins. Reasons: native is already React, so one language and one
   set of behaviour libs across platforms over the framework-free `ui-core`; the tooling that
   matters (Claude Design `/design-sync`, Storybook MCP, Base UI) is React-first; React 19.3 with
   the Compiler removes the memo tax; models write React with a lower silent-error rate than Solid's
   reactivity. Solid 2 is at `rc.11` with Kobalte in alpha pinned to `rc.3`, lucide with no Solid 2
   package, and no working form library; the Solid 1 to 2 migration would be a rewrite anyway.
2. **Substrate:** `@base-ui/react` (stable 1.x, MUI's concentration) for headless behaviour,
   TanStack Router with file-based routing (keeps `plugin-solid`'s codegen model), TanStack Query
   and Form (same API family as today's Solid ports), Tailwind v4, React Compiler on,
   `lucide-react` icons, `@fontsource-variable/inter` shipped as the default sans.
3. **No backwards compatibility.** No consumer is in production. Old decisions, PRDs, epics, and
   Solid-era docs are deleted, not preserved. Stale material is a defect.
4. **Not helm's board.** The programme is run by an orchestrator session driving implementer
   subagents (§7), with one progress file (§8). No stories, gates, or ledgers.
5. **References by survey.** The reference sheet is built per pattern from Mobbin, not from
   assumed anchor apps. Apps that recur across pattern shortlists become anchors by count.
6. **Artboards on the real CSS.** Every design artboard links the emitted `app.css` and uses only
   contract classes, so designing is changing token values and writing contract markup, and
   implementing is moving that markup into a component. Nothing designed can be inexpressible.
7. **Foundations first, then group by group.** Not all design before all implementation: the
   rendered component is the truth and the artboard its sketch; each group is designed,
   implemented, and rendered before the next starts.
8. **Claude Design sync last.** Only after components exist; pushing the current look would be
   pushing the defect.

## 5. Verified tooling (versions as of 2026-09-29; re-verify before installing)

| Tool | Status | Use |
| --- | --- | --- |
| React 19.3.0, `babel-plugin-react-compiler` 1.0.0 | stable | web runtime |
| `@base-ui/react` 1.8.0 | stable since 2025-12 | headless behaviour |
| TanStack Router, Query 5.x, Form 1.x (React) | stable | routing, data, forms |
| Tailwind 4.3.x | stable | the `@theme` emit target, unchanged |
| `@fontsource-variable/inter` 5.3.0 (has `opsz`) | stable | default sans; stack's `fonts` option already handles FontEntry, preload, metric fallback |
| `lucide-react` | lockstep with lucide | icons; consumer supplies a closed `IconSet` map as today |
| Playwright 1.63 `toHaveScreenshot` | stable | visual baselines over the showcase, run in a pinned container |
| `@axe-core/playwright` 4.13 | stable | accessibility over the same pages |
| Storybook 10.6 | optional | only if a controls UI is wanted; the showcase is the source of truth |
| Argos Hobby (5,000 shots/month free) | optional | diff review UI on PRs; not needed at start |
| Chromatic, Percy | skip | cost over value at this size |
| Lost Pixel | do not adopt | archived 2026-04 |
| Mobbin MCP (`search_screens`, `search_flows`, `search_sections`) | available | the reference survey |
| Claude Code `/design` (Design artifact: HTML artboards on a canvas) | available | the design review surface |
| Claude Design design-system projects + `DesignSync` tool | React-only `/design-sync`; docs say Team/Enterprise with the feature enabled; the account listed no design systems on 2026-09-29 | Stage 5; verify with a read-only `list_projects` first (may prompt for a scope on the claude.ai login) |
| Claude in Chrome | available | screenshots of consumer screens during builds |
| DTCG tokens, Style Dictionary, Figma variables | skip | nothing in the loop reads them |

## 5b. Design-system tooling in the Claude ecosystem (surveyed 2026-09-29)

What to adopt, and what each is for. Everything else surveyed (ui-ux-pro-max, Owl-Listener,
julianoczkowski, design-system-ops, the a11y agent kits) is either a competing format, LLM-judged
only, or aimed at a system that already drifts; none is adopted.

| Adopt | What it gives | How it is used here |
| --- | --- | --- |
| Google `design.md` spec + `@google/design.md lint` and `diff` (github.com/google-labs-code/design.md) | the one open, tool-neutral definition format: YAML front-matter tokens (colors, typography, rounded, spacing, components with `{ref}` aliases), eight fixed body sections, a linter (schema, broken refs, WCAG contrast per component pair, missing sections, exit 1) and a token diff with a `regression` flag | stack **emits** `DESIGN.md` from `ui-core` (one emitter beside `emit.ts`); `lint` runs in `check`; `diff` runs in CI; the file is what Claude Design, `/design`, and every agent read as the contract |
| plugin87 `ux-ui-agent-skills` (github.com/plugin87/ux-ui-agent-skills) | the most measurable "done" in the ecosystem: 43 gates, 31 of them in a headless browser (real-render contrast light and dark per state, target size, overflow at 280/320/414, axe, focus trap, keyboard, reduced motion, "declared states visibly change"), plus a `design-critic` agent that must render before it speaks | **not installed** (Python + house style); its gate design is re-implemented as stack's own Playwright suite over the showcase (§6 Done) |
| impeccable, Vercel `web-design-guidelines`, Anthropic `frontend-design`, OneRedOak `design-review` | read once for what §6 lacked: impeccable's craft floor, Vercel's code-hygiene checklist, the anti-default list and the precedence rule, the seven-phase screenshot review | **not installed** (each carries a house taste that competes with the rubric, and a skill's description fires on its own). Their unique content is folded into `rubric.md` and stack's own agents in `.claude/agents/`: `design-critic` (measures, interacts, judges, runs the hygiene checklist), `designer` (drafts artboards on the real CSS), `implementer`. `impeccable detect` was run on a fixture and dropped: the contract makes its source rules impossible by construction, its render rules are §6 Done rows, and it flags Inter as an overused font |
| bundled `dataviz` skill and its `validate_palette` script | the only runnable chart-palette gate (hue order, OKLCH L bands, chroma floor, CVD separation ΔE ≥ 8, mark contrast ≥ 3:1) | the chip and status families and any chart ramp pass it; martechthings has `BarChart` and `Meter` |
| `VoltAgent/awesome-design-md` | 73 `DESIGN.md` files reverse-engineered from the public CSS of Stripe, Vercel, Linear, Claude and others: measured values, not impressions | a second source for the reference sheet beside Mobbin (Stage 0.1) |
| `secondsky/tailwind-v4-shadcn` skill, `mattbx/shadcn-component-review` | Tailwind v4 `@theme inline` and OKLCH dark-mode mechanics; a "semantic tokens only, `gap` over `space-y`, `size-*`" component review | reference only; no shadcn components |

What none of them cover, and stack must build itself: parsing Tailwind v4 `@theme` as the source
of truth (so the `DESIGN.md` emitter is ours); measuring spacing and type-scale conformance on the
rendered page rather than in source (the showcase plus computed styles against the contract makes
this possible because the contract is data); validating a full state × variant × theme matrix
declaratively (ui-core's matrices already are that matrix, an advantage no surveyed tool has);
a rubric for density, information design, and node canvases.

## 6. Definitions: complete, done, beautiful

### Complete (an inventory; a script counts it)

1. The contract declares every value a component may use: colour roles (surface ladder, three
   inks, accent and soft, six status pairs, six chip families, eight avatars), type roles, spacing
   rungs, radius rungs, shadow levels, **motion** (a duration scale and one easing set, missing
   today), breakpoints, widths, density geometry. Every value derives from a knob; none is hand-set
   in a component.
2. Three tiers, enforced: knobs and calibration (primitive) → roles (semantic) → matrices
   (component). A component references roles only; the zeroed Tailwind namespaces make palette
   steps non-existent, and the geometry gate rejects everything else.
3. Every roster component has a spec with: anatomy, variant axes (the matrix), sizes and density
   behaviour, the eight states (rest, hover, focus, active, disabled, loading, error, selected)
   plus empty where it applies, token mapping, and ARIA (role, keyboard model, what a screen
   reader announces).
4. The showcase renders every component × cell × state × mode × density, and a script asserts the
   rendered count equals the spec count. A component without a cell is incomplete.
5. `DESIGN.md` is emitted from the contract and lints clean.
6. Chart and chip parameters (ramps, categorical order, status palette, light and dark surfaces)
   are declared and pass the dataviz validator.
7. Each component has its roster entry (what it owns, its anchor from the reference sheet).

### Done (gates; every one an exit code, run by `check` or CI)

| Gate | Threshold | Where |
| --- | --- | --- |
| `pnpm check` and the package verify suites | green | check |
| geometry gate | zero off-contract classes in consumer code | build |
| hard-coded values | zero raw hex, px, ms in components and consumer UI | lint |
| token references | every `{ref}` in `DESIGN.md` resolves; `diff` reports no regression | check, CI |
| contrast, measured on the real render | text ≥ 4.5:1, large ≥ 3:1, UI components, focus rings and icon-only controls ≥ 3:1, in light and dark, in every interactive state | Playwright over the showcase |
| target size | ≥ 24×24 CSS px for every control, ≥ 44×44 for primary acts under touch density, ≥ 8 px between adjacent targets | Playwright |
| overflow and clipping | no horizontal overflow at 320, 390, 768, 1280, 1440; no clipped text at 200% text spacing | Playwright |
| accessibility | axe-core zero serious or critical; every control keyboard-operable; visible focus ≥ 3:1 not obscured by sticky elements; overlays trap and return focus | `@axe-core/playwright` plus scripted checks |
| states | every declared state produces a visible change (non-zero pixel diff from rest); reduced-motion path preserves state | Playwright |
| motion | `prefers-reduced-motion` honoured without a global kill; transform and opacity only; no `transition: all` | critic hygiene step plus lint |
| screenshots | every showcase cell matches its committed baseline | Playwright `toHaveScreenshot` in a pinned container |
| console | zero errors or warnings on every showcase page | Playwright |
| code hygiene | the critic's hygiene checklist (`.claude/agents/design-critic.md` step 6) clean on the files that draw the unit | per unit |

A unit is done when every row is green and its roster entry is written. Nothing here is judged.

### Beautiful (judged; numeric tells first, then the critic, then fcalell)

Numeric tells, checked before anyone looks:

1. Reference conformance: within the reference sheet's measured range for the pattern (type
   sizes, row heights, radii, hairline lightness, spacing, state treatments).
2. Type: an obvious scale with at most six sizes in use on a screen; display ≥ 2.5× body where a
   display role appears; measure 45 to 75 ch; tracking never below −0.04em; body never below
   12 px at any density; one sans for UI, mono only for what a machine reads.
3. Hierarchy: three ink levels carry it; no fourth grey; colour never carries hierarchy.
4. Structure: hairlines and surface steps separate regions; fills mark selection and data only;
   more than one radius and more than one shadow in the system, each spent by role, never one
   stamped on every block.
5. Colour: chrome achromatic or hued on purpose, never a pure mid-grey; accent in one place per
   screen (acts, selection, focus, links); status and chip hues fixed per family; dark mode is its
   own calibration, not an inversion.
6. Motion: one duration scale, one easing set, one authored moment per screen at most; 150 to
   300 ms for micro-interactions.
7. Composition: one focal point per screen; the page has an owner (a frame molecule); nothing
   floats; empty space is intentional.
8. Bans (any one fails): eyebrow labels, nested cards, gradient text, emoji as icons, placeholder
   or lorem content, accent rails (`border-left` > 1 px), glow, mono as costume, and the five
   AI-default looks (cream + serif + terracotta; near-black + acid accent; broadsheet hairlines;
   the uniform rounded-card kit; tracked all-caps eyebrows with middle dots and arrows).

The critic (stack's `design-critic` subagent, `rubric.md` as its rubric): renders the unit at 1280 and 390, light and dark, pointer parked off-screen,
transitions disabled; clicks every control; returns **ship / rework / reject** with every finding
tied to a file and line, a gate row, or a screenshot; "a passing gate is never evidence of
taste". It runs before fcalell sees anything.

fcalell's sign-off on the rendered showcase, recorded in `progress.md`, is the last word.

## 7. How the work is run

**Orchestrator** (this session's model, full effort): plans each stage, writes each implementer
brief, reviews every result against the rubric and the checks, publishes and republishes the
artboards, records progress, and asks fcalell only the questions that are his: taste calls on
artboards, and decisions with more than one defensible shape.

**Designer** (`.claude/agents/designer.md`, Opus 5.5 at high effort): drafts an artboard on the
real CSS in contract classes from the reference sheet and the rubric, renders it, measures it
against the pattern's range, and reports every contract gap. The orchestrator publishes the board;
fcalell judges it. The designer never implements a component.

**Implementers** (`.claude/agents/implementer.md`, Opus 5.5 at medium effort): one per unit of
work, in isolated worktrees when they run in parallel. Each brief is self-contained: the unit's goal, the files it owns, the contract rules it must obey
(`~/.claude/rules/ui.md`, `.helm/agents/conventions.md`), the reference crops and artboard it
implements, the check it must run, and what it must report. An implementer never decides a look;
it implements an approved one and reports where the contract could not express it.

**Parallelism**: foundations are serial (everything depends on them). Within a component group,
components run in parallel, one implementer each, then the orchestrator composes the group sheet.
Groups are serial in roster order (atoms, layout, shared, content) because each composes the one
before.

**Verification per unit**: the §6 Done gates, then the `design-critic` subagent's verdict, then
the orchestrator's comparison of the showcase cell against the artboard export, then fcalell's
sign-off on the render. An implementer never runs the critic on its own work.

**Effort rule**: an implementer that hits a contract gap stops and reports it; the orchestrator
resolves it in the contract (a variant, a token) and re-briefs. No workarounds at the call site.

## 8. Tracking across sessions

One file: `progress.md` beside this brief. It holds, and only it holds:

- the stage and unit currently in flight,
- a checklist per stage with each unit's state (`todo`, `designed`, `approved`, `built`, `done`),
- the artifact URL of every published artboard set,
- fcalell's approvals with dates,
- decisions taken since this brief, each one line,
- carried-forward items: what a session found and left undone.

Session protocol: start by reading this brief's section for the current stage and `progress.md`;
end by updating `progress.md`. Compaction and `/clear` cost nothing because no state lives in chat.
Artboard sources live in the repo (`plugins/react-ui/design/`), so a republish never depends on a
previous session.

## 9. The plan

### Stage 0. Clean slate and ground

**0.0 Clean slate.** Delete what no longer applies; do not archive, do not keep "for reference".
Known stale items (audit for more):

- stack: `plugins/solid`, `plugins/solid-ui`, `packages/typescript-config`'s `solid-vite` preset,
  Solid client code in `plugins/auth` and `plugins/vite`, `docs/prd/*`, `docs/analysis/*`,
  `docs/roadmap.md`, `.helm/board/` entirely, `.helm/knowledge/architecture/ui-roster.md` (its
  anchors are assumptions; the roster's ownership prose is rewritten in Stage 2),
  `.helm/knowledge/architecture/ui-core.md` sections that describe Solid, Kobalte, or the
  calibration's provenance, the `home.tsx` template. Keep `slot-catalog.md`, `overview.md`,
  `commands.md`, `runtime.md`, `consumer-project.md`, `philosophy.md`, and update each for the
  React plugins when they exist, not before.
- martechthings: `.helm/knowledge/product/design-language.md` (rewritten in Stage 3 from the
  approved screens), Solid references in `.helm/knowledge/architecture/overview.md`, the board
  epics' Solid assumptions. The app code is rewritten in Stage 6; leave it running until then.
- Each deletion updates the knowledge index in the same change. Stack's `.helm/knowledge/index.md`
  load triggers must match what remains.

**0.1 Reference survey.** For each pattern below, `search_sections` and `search_screens` on
Mobbin, shortlist three to five executions from any app, record each with a one-line reason, the
Mobbin link, and its measurable facts. Patterns: sidebar and scope switcher; settings form;
data table with inline edit; record pane beside a list; command palette; picker and menu; sheet
and confirm; toast and banner; empty state; onboarding; login and OTP; page header with acts;
diff and code; activity feed; board columns; node canvas; chips and statuses; filters and
toolbars; members and invitations; version picker; keyboard-first navigation; dark mode; density;
loading and pending. Output: `reference-sheet.md` in this folder, per pattern, plus the anchor
apps that recur, by count.

Second source: the 73 `DESIGN.md` files in `VoltAgent/awesome-design-md`, which carry the measured
CSS of Stripe, Vercel, Linear, Claude and others; cross-check Mobbin winners against them.

**0.2 Rubric.** Fill §6 Beautiful's line 1 with the sheet's numbers per pattern. Output:
`rubric.md` in this folder, the file the critic agent loads.

**0.2b Agents.** Define `.claude/agents/design-critic.md`, `designer.md` and `implementer.md`
in stack (§7), frontmatter keys verified against the current Claude Code docs; no third-party
skill is installed. The `## Design system` block in stack's and each consumer's `CLAUDE.md`,
pointing at the emitted `DESIGN.md`, is written at 0.4 when the file exists.

**0.3 React plugins scaffold.** `plugins/react` (TanStack Router file routing via codegen,
bootstrap, providers virtual module, meta) and `plugins/react-ui` (emits `app.css` from ui-core,
fonts with Inter as default sans, the icon map, the geometry gate wired as a build step, and the
**showcase**: a dev route generated from `ROSTER` and `harness.matrixCells` that renders every
component in every cell and state, with mode and density toggles). At the end of 0.3 the showcase
renders nothing but exists on the real CSS. Slot changes update `slot-catalog.md` in the same
change.

**0.4 Contract emitters and the motion scale.** A `DESIGN.md` emitter in `ui-core` beside
`emit.ts`, with `@google/design.md lint` wired into `check`; the motion tokens (duration scale,
easing set) added to the contract, since §6 Complete requires them and the contract has none.

**0.5 The gate suite skeleton.** The Playwright project over the showcase with the §6 Done rows
as empty tests that fail on a missing cell, so every later unit lands into a suite that already
runs. `@axe-core/playwright`, the contrast measurement on the composited render, target size,
overflow, states-change, console. Baselines start at Stage 4; the other gates run from here on.

### Stage 1. Foundations (loop L1)

One Design artifact, "Foundations", artboards as HTML files under `plugins/react-ui/design/`
linking the emitted `app.css`:

1. type scale at both densities, every role, Inter with `opsz`;
2. colour ladder: canvas, surface, group, edge, three inks, accent and soft, six status colours,
   six chip families, eight avatars, both modes side by side;
3. spacing rhythm, radius, hairlines vs fills, elevation (hairlines under `flat`; `float` and
   `sheet` shadows);
4. states sheet: hover wash, focus ring, selection, disabled, on every surface.

Loop L1: publish, fcalell marks what is off, change the knob or calibration, republish; two or
three rounds. Exit: all four boards pass the rubric by his word. Port: `tokens.ts` (knobs,
calibration, a desktop type scale under `density: "desktop"`), regenerate the reference fixture,
re-run contrast. Sign-off on the rendered showcase foundations page.

Expected changes from the diagnosis: Inter as default sans; `radius` default 6; fields and
groups on `surface` with a 1 px `edge` hairline under `flat`, `group` fill reserved for selection
and chips; body 14, meta 13, label 12, heading 15, title 22 at desktop density; a wider neutral
ladder; accent hue and chroma to the approved value.

### Stage 2. Components, group by group (loops L2a, L2b)

Order: atoms (17), layout (11), shared (14), content (12). One Design artifact per group, one
artboard per component with every cell and state, both modes, beside its reference crops.

Per component, seven steps: (1) artboard in contract markup on the real CSS; (2) L2a: canvas
with fcalell until approved; (3) the approved class strings become the cva matrix entry in
ui-core, verbatim; (4) the React component in `plugins/react-ui` over Base UI, canon props; (5)
the showcase cell renders it, screenshot beside the artboard export; (6) L2b: any difference is a
component fix or a contract gap that returns to (1) for that component only; (7) roster entry
written, axe run.

Group review: one artboard composing the whole layer, to catch inconsistencies between
components that each passed alone. `Table` and `Shell` are the two that take real time.

Native follow-through: token and matrix changes are carried into `plugins/native-ui` per group,
verified by its suite; native rendering review is by eye on a device until a native screenshot
harness exists.

### Stage 3. Screens and composition (loop L3)

Real screens composed from approved components, both modes: martechthings' Settings, Overview,
Pages table with the page pane, Schema editor, login, onboarding; stead's three most used screens.
Screens expose what components cannot compose: a page header with acts, a first-screen frame, the
table with an editing pane, section rhythm. Each gap is a new molecule through Stage 2's seven
steps. Exit: every listed screen passes on the canvas and renders in the showcase as a composed
example. Output: martechthings' `design-language.md` rewritten from the approved screens.

### Stage 4. Lock

Screenshot baselines over every showcase cell × mode × density, committed and run in a pinned
container in stack's CI (stack has no `.github/` today; create it); the full §6 Done table
promoted into stack's `check` with the verify suites; `design.md diff` in CI. A build rule in `.helm/agents/` for stack and every consumer: a screen is done when every
Done row is green, the critic returned ship, and fcalell signed off on the render.

### Stage 5. Close the design loop

Generate one `@dsCard` HTML per component group from the showcase by React SSR; verify the account
can hold a design-system project (`list_projects`); push through `DesignSync` under a finalized
plan. From then on a new screen is designed in Claude Design with the real components and handed
off as HTML in the roster's vocabulary. Deploy the showcase on Cloudflare as the component
reference; update stack's knowledge entries.

### Stage 6. Consumers

martechthings first (the smaller, and the one whose screens Stage 3 designed), then stead. Each
screen migrates against its artboard, verified by loop L4: a Chrome screenshot beside the
artboard, both modes. When a consumer's React build passes the same checks, its Solid plugins are
removed from the config. Sailward's move onto stack is a separate programme after this one.

### Loops in one view

```
L1  foundations   canvas ↔ fcalell        → tokens.ts             (2–3 rounds)
L2a component     canvas ↔ fcalell        → variant table          (1–2 rounds each)
L2b component     showcase ↔ artboard     → component fix or L2a   (orchestrator)
L3  screens       canvas ↔ fcalell        → new molecules → L2     (2–3 rounds)
L4  consumer      chrome shot ↔ artboard  → screen fix             (per screen)
∞   any change    showcase diff           → approve or revert
```

fcalell's time goes into L1, L2a, and L3: looking at artboards and saying what is off. Everything
else is the orchestrator's and verified by a check.

## 10. Standing rules that apply throughout

- `~/.claude/rules/ui.md` (the design-system rule for every `*.tsx`), `~/.claude/rules/knowledge.md`
  when editing `.helm/knowledge/`, stack's `.helm/agents/conventions.md` for TypeScript and
  placement, `.helm/agents/plugin-authoring.md` with `slot-catalog.md` for plugin and slot work.
- Verify library behaviour against current docs (context7 or the registry), never from memory.
- Least code, simplest shape; no workarounds; a contract gap is fixed in the contract.
- Never commit or push unless fcalell asks.
- The check is `pnpm check` at the repo root plus the package's `pnpm verify`; from Stage 4 on, the
  screenshot and axe suites are part of it.
