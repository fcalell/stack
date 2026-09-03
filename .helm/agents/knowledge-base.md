# Knowledge base: stack specifics

> **Load when:** editing anything under `.helm/knowledge/`. The general rules are the global
> knowledge rule (`~/.claude/rules/knowledge.md`); this file holds what is specific to the stack.

- `architecture/slot-catalog.md` is the one entry that mirrors the source on purpose: it is the
  cross-plugin contract registry and stays complete. A slot added, renamed, removed, or reshaped
  updates it in the same commit.
- A dependency-graph change updates `architecture/overview.md`; a command-procedure change updates
  `architecture/commands.md`.
