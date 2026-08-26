# Knowledge Base Index

The always-loaded **navigation map** for `.knowledge/`: update on any entry add/rename/remove.
Domain docs are read on demand, so a session pulls only the leaf it needs. **Each entry's trailing
text is a load trigger, the work that should make you open that leaf, not a summary of its
contents.** Entries are durable present-tense *what/why* reference, what the code can't tell you,
not column lists or build history (authoring rules: `.claude/playbooks/knowledge-base.md`).

## Product

- [Philosophy](./product/philosophy.md): judging whether a feature, option, or API surface fits the framework: automation-first, domain ownership, composability, the shared plugin contract, or a non-goal

## Architecture

The *what/why* + gotchas (authoring mechanics live in `.claude/playbooks/plugin-authoring.md`).

- [overview](./architecture/overview.md): getting your bearings: the packages, the plugin list, the cross-plugin dependency graph
- [slot-graph](./architecture/slot-graph.md): reasoning about slot kinds, resolution semantics, contribution vs derivation, or anything that smells like plugin ordering
- [slot-catalog](./architecture/slot-catalog.md): contributing to or deriving from any plugin's slots, or picking the spec type a payload carries (`TsImportSpec`, `TsExpression`, `WranglerBindingSpec`, …)
- [commands](./architecture/commands.md): changing what a CLI command does, which root slots it resolves, or routing a plugin subcommand
- [runtime](./architecture/runtime.md): touching worker codegen, a `/runtime` factory, or how `stack.config.ts` options reach the worker
- [ui-core](./architecture/ui-core.md): touching the token contract or theme schema, a variant matrix, the primitive canon, or the geometry gate; deciding whether a cell is shared or a platform overlay
- [consumer-project](./architecture/consumer-project.md): changing the scaffolded project shape, the `stack.config.ts` surface (`app` field, plugin options), or the generated `.stack/` files
