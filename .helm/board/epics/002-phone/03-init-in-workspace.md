---
id: 002-03
status: backlog
sessions: {}
---
# cli: stack init finds the plugins inside the workspace

## Goal
`stack init <dir> --plugins=native-ui` inside the stack workspace fails with "Unknown plugin(s):
native-ui. Available:" and an empty list, unless the target already has a `package.json` listing
the plugins.

## Approach
Find where init discovers plugins and why the workspace's packages are not seen. Evidence: `.helm/research/phone-harness.md`.

## Acceptance criteria
- [ ] (test) init in a fresh directory inside the workspace lists and scaffolds every plugin.
