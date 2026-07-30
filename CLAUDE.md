# @fcalell/stack

Full-stack framework for SolidJS + Hono + Cloudflare. Ships everything a consumer needs to build
and deploy a production app (database, API, UI, tooling) so they only write business logic. The
CLI orchestrates; plugins wrap their domain and coordinate exclusively through a typed slot graph,
so there is no plugin firing order to think about.

@.knowledge/index.md

`.knowledge/` (mapped by the index above) is the source of truth for _what the framework is and
why_: philosophy, architecture, the slot catalog. `.claude/playbooks/` holds the how-to-build
rules. **Nothing below the index auto-loads**: the Rules map further down says which playbook to
read for what you're about to do. Pull a doc the moment your task matches it; never pre-read the
whole base.

## Posture (non-negotiable)

These three override convenience, habit, and effort. Most often broken, hold them hardest.

- **Follow the rule; never lean on the exception.** Every exception in these rules and
  `.knowledge/` is a _closed list of already-decided call sites_, not a menu or permission to add
  one. Read exhaustive lists as exhaustive, and hedge words ("almost", "usually") as the rule still
  holding. Wanting a _new_ exception is a STOP signal. Follow the rule, or ask; never
  self-authorize.
- **Never reduce scope silently.** Dropping, deferring, stubbing, narrowing, or simplifying-away
  any part of the ask is my decision, never yours. If you can't deliver the whole thing, or you're
  tempted to cut a corner, STOP, name exactly what you'd drop and why, get confirmation first.
  Never report partial work as finished.
- **Effort is never a reason to skip the right change.** If something warrants a refactor (the
  change touches it, it's drift, the correct shape is clear), do it or flag it, however much work.
  Never pick the smaller fix _because_ the right one is more work; never leave known drift
  unflagged. Effort informs _sequencing_, never _whether_. Not license to abstract speculatively:
  a new consumer-facing option or public surface stays the last resort
  (`.knowledge/product/philosophy.md`).

## General

- Be concise: least words to describe a concept. A bullet keeps policy + the minimum mechanics to
  apply it; rationale and evidence move to `.knowledge/` or code.
- Be flexible: spot improvement/simplification/abstraction opportunities and implement them. Ask
  first when they diverge from the plans.
- **Least code, simplest shape.** Ship the least, clearest code that fully delivers the ask;
  prefer an explicit solution at the source of truth over clever indirection (wrappers, proxies,
  magic). Two limits: never write less by narrowing scope, and simplest ≠ smallest-diff. The
  clearest design is sometimes the larger refactor.
- Don't rely on (possibly outdated) training data. Check latest docs via context7. When defining a
  convention or library usage, record best practices/gotchas in `.knowledge/`, optimized for LLM
  consumption (minimal words).
- Don't document past decisions; docs are a snapshot of current state or future features.
- **Docs are generic, simple, measurable, and lead with a decision workflow.** Repo-specific lists
  (the slot catalog, spec-type registry) live in `.knowledge/` as data the rules reference, never
  inlined into the rule text.
- Prefer tools and harness-native features over raw scripts.
- Work on master branch only.

## Rules: pull the playbook before you act

`.claude/playbooks/` is **pull-only** (not auto-loaded). Before starting an activity below, **read
the listed doc(s)**, don't write in a domain without loading its rules, and read only what the task
needs.

| About to…                                              | Read                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| edit/create any TypeScript                             | `.claude/playbooks/conventions.md` (packages · placement · style)                                     |
| write/modify a plugin (slots · contributions · runtime) | `.claude/playbooks/plugin-authoring.md` + `.knowledge/architecture/slot-catalog.md`                   |
| write any prose (docs · KB · commit/PR bodies)         | `.claude/playbooks/writing-style.md`                                                                  |
| edit the knowledge base                                | `.claude/playbooks/knowledge-base.md`                                                                 |
| commit                                                 | **Conventional Commits** (`feat`/`fix`/`chore`/`docs`/`refactor`, scoped like `plugin-auth`); header ≤ ~60 chars; body says the _why_ |

## Where things are

- **Monorepo**: pnpm workspace: `packages/` (`@fcalell/cli` core + tsconfig/biome presets) and
  `plugins/` (one `@fcalell/plugin-<name>` per domain: cloudflare, db, auth, api, vite, expo,
  solid, solid-ui). Detail in `.knowledge/architecture/` (start at `overview.md`).
- **Dev loop**: `pnpm check` (Biome lint + type-check) is the per-change gate; it must pass before
  a change is complete.
- **PRDs / analyses**: `docs/prd/` (forward-looking implementation drivers; see its README for the
  fold-into-`.knowledge/`-and-retire lifecycle) and `docs/analysis/` (point-in-time audits).
