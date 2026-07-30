---
id: 001-04
status: backlog
depends: [001-01, 001-02]
---
# plugin-native-ui adoption

## Goal

`plugin-native-ui` replaces its neutral hex defaults with ui-core's derived defaults, narrows
`themeTokens` to the shared schema, emits through ui-core's records, re-exports ui-core's `cn`, and
adopts the shared matrices. It also authors the two components the matrix set names and the plugin
lacks: text and field.

Driver: `docs/prd/ui-core.md` M4. Refine before running.

## Refinement notes

- **Known problem carried from 001-01:** ui-core describes two modes; `plugins/native-ui/src/types.ts:11-22`
  accepts an arbitrary array of named themes and the PRD says native keeps uniwind's extra themes.
  This story reconciles a two-mode contract with an N-theme option. Do not narrow one into the other
  without deciding that deliberately.
- Also carried from 001-01: whether uniwind honours Tailwind v4's `--text-*--line-height` modifier
  form is unestablished. ui-core emits both that and the standalone `--leading-*` / `--tracking-*`
  namespaces; this story settles which one native actually consumes, against a running app.
- The shadow ladder emits as `@utility`, since `--shadow-*` does not resolve into RN's `boxShadow`.
- Its components already speak the Marina vocabulary, so the token sweep is small.
