---
id: 007-02
status: done
sessions: {}
---
# stack: check every served screen headlessly

## Goal
One stack command checks every screen 007-01 serves, so a screen's floors are a test result
rather than a reading: axe with every rule (page-level ones included, since each screen is a
page) in light and dark, and the rubric's numeric floors. The guide's definition of done names
this command, and the design critique keeps only the judged questions.

## Approach
- axe over each screen in each query state, both modes, desktop density (density moves sizes,
  not names, roles or states), as `pnpm stories:test` runs the showcase today.
- The rubric's numeric floors as ordinary tests: no horizontal overflow at 320, 390, 768, 1280
  and 1440; targets at the rubric's size and spacing; no console error or warning.
- Headless in a browser the machine provides (`CHROME_PATH`, else Playwright's own), as the
  showcase's run does.
- Rerun only the screens an edit touches, by the import graph, with the full run on demand.
- `ui-core`'s critique page drops the measurements the command now makes, and react-ui's
  rules page names the command in its definition of done.

## Acceptance criteria
- [x] The command fails a screen with an axe violation, a horizontal overflow at any of the five
  widths, an undersized target or a console error, naming the screen, state and mode.
- [x] An edit to one component reruns only the screens whose import graph holds it.
- [x] The critique page and the web rules' "Done" section read the command, and the critique
  measures nothing the command measures.

## Decided while building (2026-10-07), by the building session, each choice reviewed adversarially in fcalell's absence

- Target size is axe's own `target-size` rule: it implements 2.5.8's size and spacing exception
  and skips inline links. The 44 px primary act on touch stays a judged critique item, since the
  run is desktop density.
- One story mechanism: real generated story files in a gitignored `stack-screens/` folder replace
  the virtual indexer, 01's fallback.
- The screens host turns router code splitting off so `--changed` follows a route's component
  code (`react.slots.routerOptions`).
- Only the light/dark mode multiplies the check (`PreviewGlobal.checked`).
- `--changed` is the default; `--all` runs the full set.

## Open questions
- [x] Whether target size is measured by axe's own rule or by a test of the rubric's exact
  carve-outs (abutting rows, a wrapping chip row, an inline link).
