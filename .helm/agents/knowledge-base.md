# Knowledge base conventions

> **Load when:** adding, editing, splitting, or relocating anything under `.helm/knowledge/`.

`.helm/knowledge/` describes *what `@fcalell/stack` is and why* (product philosophy, architecture)
as built. Keep it current, and when the work shows a better shape than an entry records, propose
it rather than match the entry. Its index is imported into every session via
`CLAUDE.md`.

- Each entry is a standalone `.md` file in the right subfolder (`product/`, `architecture/`).
  Filename: `kebab-case-descriptive-name.md`. Entries are durable *what/why* reference, written
  present-tense ("how it works now"), not changelogs or build journals.
- **One topic per file; nest a folder when a domain has many.** Keep each file focused on a single
  topic so a session loads only what it needs (context optimization), and so links can target the
  exact topic. When a domain spans several topics, give it its own subfolder of small files instead
  of one monolith; split a file once it has grown into several loosely-related sections.
- Each file opens with a `# Title` and a one-paragraph summary. Factual and concise: reference
  material, dense for LLM consumption, not prose.
- **Cross-reference by relative file link or named anchor, never a section number.** Link to another
  entry with a relative path (`[slot-graph](../architecture/slot-graph.md)`); reference a section
  *within* a file by its heading name (`§Spec types`). **Never** cite a numbered section (`§9`):
  numbers break silently when content is added, removed, or reordered.
- **Always update `.helm/knowledge/index.md`** (the always-loaded navigation map) when adding, renaming,
  removing, or relocating an entry.
- Prefer **updating an existing entry** over creating a new one when topics overlap.
- **Decisions are recorded inline** in the doc they govern (framework rationale in
  `product/philosophy.md`, architecture rationale in the relevant `architecture/` file), not as a
  separate dated ADR log. Revise rationale in place when it changes; don't leave stale parallel logs
  or dated history to pollute context.
- **File researched findings back into the KB.** When a session turns up something durable (a
  platform/library gotcha, a debugging discovery, a design decision reached in chat), record it in
  the relevant entry (or a new one) so it compounds, instead of leaving it to evaporate in
  conversation.
- **Capture only what the code can't tell you**: invariants, the *why* behind non-obvious choices,
  gotchas, and designed-but-not-yet-built intent. Don't recite column lists, file trees, or
  dependency versions that mirror the source. The one deliberate exception is
  [slot-catalog](../knowledge/architecture/slot-catalog.md): it's the cross-plugin contract
  registry, so it must stay complete and current.
- When a plugin's slot surface changes (a slot added, renamed, removed, or its payload shape
  changed), update `architecture/slot-catalog.md` in the same commit. When the dependency graph or
  a command procedure changes, update `architecture/overview.md` / `architecture/commands.md`
  alongside. The catalog is the binding cross-plugin contract; it must never lag the code.
