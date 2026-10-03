# PRD: stack's agent guide

2026-10-03. Drains into `.helm/knowledge/` (the guide's shape, as built) and into each package's
`guide/` as the units land; delete this file when the last unit ships.

## Problem

Every repo fcalell builds is a stack consumer, and most of its code is written by agents:
interactive Claude Code sessions now, stead's headless jobs later. Today an agent learns stack
from READMEs written for stack's maintainers, from `~/.claude/rules/ui.md` on one machine, and
from guesses. Nothing tells it which page a step needs, nothing matches the consumer's pin, and a
missing part gets worked around in the consumer.

## Goal

Any agent working in a stack consumer, in any runtime, finds the one page each step needs, at the
version the consumer has installed, and follows it from concept to a shipped, reviewed change.

## The architecture

Three parties, one owner per layer.

| Layer | Owner | Shipped as |
|---|---|---|
| The pipeline: shape, refine, gate, implement, review, land (helm's loop) | stead | stead's catalog of agents, with grants, model and effort |
| How to build on stack: reference, rules, recipes per domain | stack | each package's `guide/*.md`, in its published `files` |
| The index | stack, generated per consumer | `.stack/guide.md`, written by `stack generate` |
| The product: what the app is and why | the consumer | its `.helm/knowledge/` (later stead's knowledge pages) |

- **Knowledge only.** Stack ships no agents, skills, plugins or marketplace. Evidence: an index
  always in context beat on-demand skills 100% to 79% in Vercel's evals
  (vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals); Next.js ships its docs in
  the package and keeps skills for workflows only. A subagent's value is a fresh context and an
  independent judge, which any runtime gives without a definition file.
- **The index.** Each plugin contributes guide entries through a CLI slot; the CLI contributes
  its own. `stack generate` writes `.stack/guide.md`: only the installed domains, each entry a
  load trigger (when to open the page, never what it holds) and a path under `node_modules`.
- **Reaching it.**
  - Claude Code: `stack init` makes the consumer's `CLAUDE.md` import `@.stack/guide.md`.
  - stead: a job's seed carries `.stack/guide.md` beside the repo's knowledge index
    (`stead:design/decisions.md`, "Stack's guide").
  - Stack's own sessions: `.helm/` plus the same pages by repo path.
- **Pages.**
  - Three kinds:
    - reference: what you write, where, which imports;
    - rules: measurable musts;
    - recipes: steps, each naming the page it needs and ending with the check that proves it.
  - Directive prose, never Role/Method heading skeletons (helm measured +15.6 tool calls per pass
    with them). About 600 words a page at most. Code examples checked against the code.
  - Every fact in one place: a README keeps install, a pointer to the guide, and the maintainer
    sections (plugin implementation, owned slots, lifecycle).
  - A page names a role ("the design critic"), never a mechanism: no runtime, agent, skill or tool
    name, so one page serves every runtime.
- **The screen loop**, in the screen recipe: compose from the roster with cited references and
  every state; the consumer's check; a fresh session that played no part in composing judges the
  render by the design critique page at desktop and touch, light and dark, and edits nothing;
  rework until it ships; fcalell signs off on the render.
- **The gap path**, in the cli's gap recipe: check stack's latest roster or code first (the fix
  may be moving the pin); otherwise file a `backlog` story on stack's board under one standing
  `<NNN>-stack-gaps` epic, the title prefixed with its domain. The consumer never works around it.

## Decisions

All ruled by fcalell on 2026-10-03.

- The guide lives per package, with a generated index; not a central package, not plugin skills.
- The guide is the single source; READMEs shrink to install and maintainer content.
- stead owns the pipeline roles; stack ships knowledge only.
- One `stack-gaps` epic for every domain.
- No agents, no skills, no plugin, no marketplace: guide only.
- `DESIGN.md` ships inside `@fcalell/ui-core`.
- `~/.claude/rules/ui.md` (nix) is deleted once the react-ui rules page ships.
- `stack init` writes commit-free `github:` specs; the consumer's lockfile is the pin, and
  `pnpm update "@fcalell/*"` moves every stack package together. Stack moves to pnpm 11.15 or
  later, the first to approve a `github:` tarball's build by repository URL.
- A phone screen is judged on a render like a web screen. Stack builds a phone render harness;
  device screenshots are no substitute.
- Every finding below is fixed in stack, after the guide commit, one commit each; the deploy
  upload and the phone harness get a short design fcalell approves before they are built.
- The live proof runs last, on a consumer installed from GitHub.

## Units

Each is one story. Order: 1 first, its format approved before 3; 2, 4, 5 and 6 are independent.

1. **Mechanism and pilot.** Built, uncommitted.
   - The guide slot, `stack generate` writing `.stack/guide.md`, `stack init` writing the
     `CLAUDE.md` import, with tests.
   - Pilot pages:
     - ui-core: rubric, reference sheet, design critique, screen recipe.
     - react-ui: rules, reference.
     - api: procedures, add-a-procedure recipe.
     - cli: gap recipe.
   - The plugin, its agents, the marketplace and the settings write removed.
   - Acceptance:
     - [ ] (command) `pnpm check` and the three verify suites green.
     - [ ] (file) `apps/showcase/.stack/guide.md` lists only showcase's domains, each entry a
       trigger and an existing path.
     - [ ] (command) `git grep -n "stack-ui\|design-critic\|marketplace\|CLAUDE_PLUGIN_ROOT"`
       finds nothing outside history.
     - [ ] fcalell approves the page format on the pilot.
2. **The free-by-default page.** Built, uncommitted. A cli page, "what stack gives you", listing what a consumer
   never builds (auth flows, migrations checks, the RPC client, theming, deploy), so shaping never
   specs it.
   - [ ] (file) indexed with the trigger "shaping or scoping a feature".
3. **The remaining domains.** Built, uncommitted. Config and commands (cli), db, auth, cloudflare, node, vite, react,
   expo, native-ui, and testing across api, db and auth. Each README cut to install and maintainer
   content in the same change.
   - [ ] (file) every consumer-facing README section has moved to a page; no fact in two places.
   - [ ] (command) `pnpm check` green.
4. **`stack init` writes installable specs.** `github:fcalell/stack&path:` specs with no commit,
   the `pnpm-workspace.yaml` overrides, and `allowBuilds` keyed by repository URL, replacing
   `workspace:*`; stack and the scaffold on pnpm 11.15 or later. The commands page says to
   update stack with `pnpm update "@fcalell/*"`.
   - [ ] (test) a scratch consumer from `stack init` installs and passes its check outside the
     stack workspace.
5. **stead.** The "Stack's guide" entry in `design/decisions.md`: written, uncommitted, in stead. Seeding
   `.stack/guide.md` into a job lands with stead's seed work, in stead's build plan.
6. **nix.** `home/common/claude/rules/ui.md` and its link in `default.nix` deleted, uncommitted,
   in nix.
7. **The phone render harness.** A phone screen rendered where the design critic can script and
   measure it, at the touch width, light and dark. Design approved by fcalell first.
   - [ ] (file) `add-a-phone-screen.md` step 6 runs the critique on the harness.

## Found while writing

Each is fixed in stack, one commit each; the last is unit 7.

- `stack deploy` never uploads `dist/client` to Cloudflare.
- `InferSession<typeof config>` does not compile.
- Each secret is also deployed as an empty `[vars]` entry (unverified).
- `auth({ expo: true })` uses `app.name` as the scheme, while expo uses its slug.
- `stack add` drops a plugin's `configPlugins` dependencies.
- The phone has no render harness, so the design critique cannot judge a phone screen; the
  phone recipe stops after its step 5 until unit 7 ships.

## The proof

- [ ] (live) A fresh session given only a story and a scratch consumer's `CLAUDE.md` adds a
  procedure and the screen that uses it, follows the screen loop, files nothing as a gap that the
  roster composes, and passes the consumer's check, without opening a README.

## Out of scope

- Shaping, refining, gating and reviewing in general: stead's catalog.
- Stead's own stack work: its pin drift, its stale `design/07-interface.md`, the Solid to React
  move (stead build step 5b).
- An MCP server for live state (a roster query, the slot graph, compile errors): later, when a
  recipe needs runtime state the files can't give.

## Risks and limits

- Choosing the independent judge is the session's call in Claude Code; "edits nothing" is an
  instruction there, a grant in stead. If interactive critics edit, the fix is one critic
  definition.
- The index is always loaded, so it has a budget: one line per entry, under about 8 KB in total.
- `.stack/` is generated and gitignored: a fresh clone has no index until `stack generate` runs.
- Code examples drift from the code unless something checks them. Open: type-check the examples
  in `pnpm check`.
