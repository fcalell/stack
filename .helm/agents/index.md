# Stack agent rules

The single entry point for the stack's rules, imported by the repo's root `CLAUDE.md`. It loads
the knowledge-base navigation map; nothing below the import auto-loads.

@../knowledge/index.md

`.helm/knowledge/` (mapped by the index above) describes *what the framework is and why* as built:
philosophy, architecture, the slot catalog, each entry the best shape known when it was written,
not a verdict. `.helm/agents/` holds the how-to-build rules. **Pull a doc the moment your task
matches it; never pre-read the whole base.**

A new consumer-facing option or public surface is the last resort
(`.helm/knowledge/product/philosophy.md`).

## Rules: pull the playbook before you act

Before starting an activity below, **read the listed doc(s)**, don't write in a domain without
loading its rules, and read only what the task needs.

| About to…                                               | Read                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| edit/create any TypeScript                              | `.helm/agents/conventions.md` (packages · placement)                                |
| write/modify a plugin (slots · contributions · runtime) | `.helm/agents/plugin-authoring.md` + `.helm/knowledge/architecture/slot-catalog.md` |
| edit the knowledge base                                 | `.helm/agents/knowledge-base.md`                                                    |
| commit                                                  | scope like `plugin-auth`                                                            |
