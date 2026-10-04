---
id: 002-01
status: done
sessions: {}
---
# native-ui: the generated entry imports the stylesheet

## Goal
The generated `.stack/entry.tsx` never imports `.stack/global.css`, so uniwind drops every class
and a phone app renders unstyled ("couldn't find your variable --color-ink-body").

## Approach
`plugin-native-ui` contributes `{ source: "./global.css", sideEffect: true }` to
`expo.slots.entryImports`, as uniwind requires the CSS entry imported by the app. Evidence: `.helm/research/phone-harness.md`,
"Stack defects the spike hit".

## Acceptance criteria
- [ ] (test) the entry generated for a native-ui config imports `./global.css`.
- [ ] (live) a scaffolded phone app draws the roster with its tokens.
