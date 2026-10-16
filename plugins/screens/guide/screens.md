# The screens workbench

The workbench draws every route of the web app, one screen per route, in each state its queries
can take, from fixtures and with no backend running. Open it while designing or changing any
screen, and again before calling the screen done: a screen is done when all five states look
right. The app writes no story, harness or workbench config; a new route is a new screen on its own.

```bash
stack add screens   # once: installs the workbench and its packages into the app
stack screens dev   # serves the workbench (--port 6006)
stack screens test  # checks the screens a changed file reaches; narrow it with --screen, --state, --width, --mode (see The test run)
```

## The states

Each route has five states: **data**, **loading**, **error**, **empty** and **not found**. The
toolbar sets the mode (light, dark) and the density (desktop, touch) for the screen in view.
Draw each state in the screen itself (the screen recipe,
`node_modules/@fcalell/ui-core/guide/screen.md`); the workbench only reaches them.

A forced state applies to every query the route makes. A mutation always answers from its
fixture, whatever the state.

| State | What the screen's queries get |
| --- | --- |
| data | The fixture's value |
| loading | No answer until the test run releases it, then the fixture's value (the workbench never releases it, so the story stays waiting) |
| error | A server error |
| empty | The fixture's value with no items: an array becomes `[]`, a `{ data, nextCursor }` page keeps its envelope with no rows, and a record has no empty form (it answers as it is) |
| not found | A `NOT_FOUND` error, which `isNotFound(error)` from `@fcalell/plugin-api/client` tests |

## Fixtures

All fixtures live in `src/app/fixtures.ts`: one per procedure, shared by every screen that calls
it, typed by the router, so a fixture that departs from its procedure's output fails
`pnpm check`. The second argument gives an example value for each route `$param`, by name.

```ts
// src/app/fixtures.ts
import { defineFixtures } from "@fcalell/plugin-screens/fixtures";
import type { AppRouter } from "../../.stack/worker";

export default defineFixtures<AppRouter>(
  {
    projects: {
      list: () => [{ id: "acme-web", name: "acme-web", status: "Live" }],
      get: ({ projectId }) => ({ id: projectId, name: projectId, status: "Live" }),
    },
  },
  { projectId: "acme-web" },
);
```

- A procedure with no fixture answers `no fixture for projects.get` and never reaches the
  network; add the fixture.
- A route whose `$param` has no example value fails its story, naming the param.
- A fixture takes the procedure's input and returns its output; give it a value for every state
  the screen draws, not only the happy one.
- A plugin supplies the fixtures of the endpoints it owns: with `auth`, every screen sees a
  signed-in session, so the app writes fixtures for its own procedures only.

## Routes

A route renders as it does in the app, so a parent route (a layout, `route.tsx`) draws its
children through `<Outlet />`; without it a screen under the parent shows an empty frame.

## The test run

`stack screens test` opens each screen in a headless browser and fails it on

- an axe violation (every rule, the page-level ones and `target-size` included);
- a horizontal overflow at 320, 1280 or 1920 px (320 draws the touch density, 1280 and 1920 the
  desktop one, as a phone and a laptop do);
- a finding of the render walk, below;
- a console error or warning;
- a shift of the loading story (below);
- any of these with one read failed (below).

A failure names the screen, the state and the mode. A screen is drawn in five states and two modes
(light and dark), and the run visits each at the three widths.

### The loading shift

A Section stands whatever its data holds, so the page must not jump when the data arrives. In a
Loading story the run measures each Section at each width while the calls are held, answers them,
waits until nothing is `aria-busy` (a button's own busy excepted) and the page has settled, and
measures again. Per Pane, and per column of Sections side by side in it, it reports:

- a Section that stood while waiting and is gone loaded;
- the first Section moving at all (what stands above it changed height);
- a later Section moving by other than what the Sections above it grew by;
- a Section changing height with no rows, chart or text in it, in either form;
- a Section that was not there arriving above one that was.

Each finding fails the screen. The fix is in the screen's outline, never in the paint, which is the
loaded form already at the loaded heights: give every Section a `read`, stand the ones that always
stand before any that may not (a Banner or a PendingBar whose condition lands with the data goes
below the Sections), and keep a text that wraps short enough to wrap the same painted and loaded.
`shift.ts` holds the measurement and `compare`.

### Each read failed

A screen with one read failed is a state the five do not reach: the error story fails every query at
once, so a frame that holds a read nobody else does never meets it alone. After the Data story's
floors, when the screen called two or more procedures, the run fails each procedure in turn and
draws the screen again:

1. the procedure's queries answer a server error and every other procedure answers its fixture;
2. those queries reset (on the procedure and on the one failed before it, which answers data
   again) and fetch again;
3. once nothing is busy and the page has settled, the horizontal overflow and the render walk run
   at each width, and the console is read.

Nothing declares the reads: the run takes them from the procedures the Data story called, so a read
that depends on another's answer, or an ambient one, is covered like any other. Each finding is
prefixed `with <procedure> failed:`, for example
`with usage.plan failed: console.error: The read [["usage","plan"],…] failed and no frame holds it`.
That is the usual one: a Section, Pane, Sheet or Form that draws a read needs `read={…}` on it, or
its failure draws nowhere and the leaf stays painted.

- It covers the sidebar's Data story only (not the hidden variants a `--mode` narrows to), and a
  screen with one procedure is the error story's case.
- Empty, not found and waiting are not repeated per read: the empty story already empties every
  collection, a missing form is the failed form with another sentence, and a painted leaf has its
  loaded geometry, which the loading shift holds. Axe does not run per read; the roster stories
  judge the failed forms.
- A failed read retries once before it fails (about a second), so a screen costs about two
  seconds for each procedure it calls (on the showcase, 4 to 5 procedures take 10 to 15 seconds).

`called()` and `failing()` in `src/ui/answer.ts` hold the record and the failure, and `perRead()` in
`src/ui/floors.ts` the run.

### The render walk

One walk of the page's elements at each width, after the resize settles, reads what is drawn against
the contract's values: the page's own computed `--spacing-*`, `--text-*` and `--radius-*` at the
density it is in (inside a `Place` that declares a `room` distance, the room's own values). It reports
a finding as `rule: element measured X, expected Y; fix: how`.

| Rule | A finding is |
| --- | --- |
| `type-size`, `type-sizes` | a visible text under 12 px; more than six distinct font sizes on the screen |
| `control-height` | a button, field, switch, combobox, tab or checkbox whose height is no size token (control, control-compact, field, target, chip...); where it sets a floor (`min-h-*`), a floor that is no token, or a height under it |
| `row-height` | a row, option, menu item or tree item under the shortest row token |
| `gap`, `inset` | a flex or grid container's gap or padding that is neither 0 nor a spacing token |
| `radius` | a corner that is no radius role or pill |
| `nested-radius` | a box inside a rounded box with an inset smaller than the outer radius whose radius is not the outer less the inset |
| `clip` | a box that clips (`overflow` hidden or clip) with more inside than it shows and no ellipsis or line clamp |
| `font-late`, `font-failed` | a font face still loading at the screen's first frame, or failed |
| `tabular-digits` | a text that is only a number (digits with separators, a sign, a percent, a currency symbol or a unit of up to three letters) in a proportional face without `tabular-nums` |
| `region-name` | a landmark region inside another of the same accessible name |

Four more rules are `align-*`. They are report-only: `findings()` leaves them out until `ALIGN_FAILS`
(`walk.ts`) is set, `alignFindings()` returns them, and a run prints them as `at <width>px, align-…`
lines (a screen) or `<component> <density>: align-…` lines (the roster stress) without failing.

| Rule | A finding is |
| --- | --- |
| `align-dead` | a box in the flow, wider and taller than half a pixel, that draws nothing: no text, background, border, shadow or outline, no picture or control, nothing inside that draws (the empty end square of a row). Out-of-flow boxes, pictures, controls, table cells and fully transparent boxes are not found |
| `align-centre` | a row (a flex row with a row role, or the floor of a row token) whose end items, the drawn leaves beyond its label's right edge, are more than 1 px off the row's vertical centre (a value on the label's line beside a chevron on the row's middle) |
| `align-baseline` | two bare texts of different sizes on one flex-row line whose baselines differ by more than 1 px (a count centred by its line box beside a heading). Texts inside a painted box or a control, an item of two lines and a nested row's own texts are left out |
| `align-grid` | any element whose computed `display` is `grid` or `inline-grid`: the layout is flex alone, so the phone mirrors it |

The walk leaves out what is not drawn: `display: none`, `visibility: hidden`, `aria-hidden`, a box under
a pixel wide or high, and what a pixel-wide clipping box holds. It sees through `display: contents`.
Its named exceptions are listed in one place, `EXCEPTIONS` in `@fcalell/plugin-screens/walk`, each with
its reason; a finding is fixed in the component or the screen, never baselined.

A behaviour story calls the same walk after an input, so a state a click or a key reached is judged
too: `findings()` and `format()` from `@fcalell/plugin-screens/walk` give the page's findings, and
`findings({ roots })` the findings under some elements alone (the roster stress does this for one
component's frames); `focusCovered()` reports the focused element when a fixed or sticky element covers it;
`rootMargins(frames)` the roster frames' roots that carry a margin.

### Narrowing a run

With no flag the run covers the screens a file with uncommitted changes reaches, in every state, mode
and width. Flags narrow it on each axis and combine freely; the run prints what it covers first.

| Flag | Narrows to |
| --- | --- |
| `--screen <list>` | the screens named, instead of those a changed file reaches: a route id (`/_app/deploys`) or a screen's title (`deploys`, `Screens/deploys`), comma separated |
| `--state <list>` | some of `data`, `loading`, `error`, `empty`, `notFound` |
| `--width <list>` | some of `320`, `1280`, `1920` |
| `--mode <list>` | some of the app's modes (`light`, `dark`) |
| `--changed <ref>` | the screens a file changed since the git ref reaches (a batch committed in a worktree runs `--changed master`); beside `--screen` it keeps only the named screens that file reaches |
| `--all` | every screen |

A change under the `src/` of a workspace package the app links, outside the directories its source
exports serve, reruns every screen: it reaches no screen's module graph.

**The narrowed run is the gate.** Choose the narrowest run the diff allows:

| The diff | Run |
| --- | --- |
| Nothing but a screen's own file (a route, its components, its fixtures) | the default: the screens it reaches; `--screen <it>` names them |
| A component or a screen's markup | the screens that use it (grep the app's routes for the component), `--screen a,b` |
| A loading form only | `--state loading` |
| An error, empty or not found form only | `--state error`, `--state empty`, `--state notFound` |
| A colour, an ink or a surface; no token, theme or layout change | `--mode light` (or the app's default mode) |
| Something behind one width variant (`touch:`, `page-tablet:`, a breakpoint) | that width: `--width 320` for `touch:`, `--width 1280,1920` for a `desktop:` or `wide:` |
| A new screen | all its states, one mode, all widths: `--screen <it> --mode light` |
| ui-core's tokens or theme, the app's CSS, a frame component (Shell, Place, Pane, Section) or a dependency bump | the full run: `--all` |

Combine the rows: a loading change on one screen's touch tree is
`stack screens test --screen deploys --state loading --width 320 --mode light`.

### The component stories

A component is judged in the showcase's Storybook (`pnpm exec vitest run` in `apps/showcase`), and a
single one runs alone:

- by file: `pnpm exec vitest run behaviour/picker.stories.tsx` (a behaviour story),
  `pnpm exec vitest run stories/Picker.stories.ts` (the roster's states of one component);
- by name: `-t "Popover"` filters the tests of the files given by their names;
- the roster stress, which also runs the walk over the component's frames and the root-margin check,
  for one component: `pnpm exec vitest run stories/RosterStress.stories.ts -t "^Picker( Touch)?$"`.

## Limits

- `target-size` is axe's WCAG 2.2 rule, the rubric's target floor: a target under 24 px fails
  only when a 24 px circle on it meets another target, so a lone small control passes. The 44 px
  primary act on touch is judged, since the run is at desktop density.
- Queries must come from `createApiQueryUtils` (`node_modules/@fcalell/plugin-api/guide/client.md`).
  Query utils built directly with oRPC's `createTanstackQueryUtils` send queries as `POST`, so a
  forced state never reaches them.
- An open non-modal popup (a Menu, a Select, a Picker, a Pane's more menu) is judged like the
  rest of the page: the roster takes `aria-hidden` off Base UI's focus guards, so axe's
  `aria-hidden-focus` has nothing to flag and nothing is excluded.
- The session is one fixed signed-in user with no app-specific session fields, and there is no
  signed-out state.

**Check:** `stack screens dev` lists the new route with its five states, each drawing as
designed, and `stack screens test` and `pnpm check` pass.
