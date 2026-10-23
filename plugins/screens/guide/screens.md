# The screens workbench

The workbench draws every route of the web app, one screen per route, in each state its queries
can take, from fixtures and with no backend running. Open it while designing or changing any
screen, and again before calling the screen done: a screen is done when all five states look
right. The app writes no story, harness or workbench config; a new route is a new screen on its own.

```bash
stack add screens   # once: installs the workbench and its packages into the app
stack screens dev   # serves the workbench (--port 6006)
stack screens test  # checks the screens a changed file reaches; narrow it with --screen, --state, --width, --mode; --shots <dir> saves a PNG of each (see The test run)
```

## The states

Each route has five states: **data**, **loading**, **error**, **empty** and **not found**. The
toolbar sets the mode (light, dark) and the density (desktop, touch) for the screen in view.
Draw each state in the screen itself (the screen recipe,
`node_modules/@fcalell/ui-core/guide/screen.md`); the workbench only reaches them.

A forced state applies to every query the route makes, except one a plugin's fixture module
answers (plugin-auth's `auth.session`: the frame's precondition, not the screen's read). A mutation
and a plugin-owned procedure always answer from their fixture, whatever the state; the app's own
fixture for the same procedure overrides the plugin's and follows the state like any app read.

| State | What the screen's queries get |
| --- | --- |
| data | The fixture's value |
| loading | No answer until the test run releases it, then the fixture's value (the workbench never releases it, so the story stays waiting) |
| error | A server error |
| empty | The fixture's value with no items: an array becomes `[]`, a `{ data, nextCursor }` page keeps its envelope with no rows, and any other object (a record) is walked with every array in it emptied to `[]`, the rest kept; a JSON Schema object schema (`type: "object"` and an object `properties`) also has its `properties` emptied to `{}`, so a stored schema's fields list is empty |
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
  network; the workbench draws it as a failed read, and the test run fails the story on it. A
  fixture that throws anything but the procedure's own error fails it the same way
  (`the fixture for projects.get threw: …`).
- A route whose `$param` has no example value fails its story, naming the param.
- A fixture takes the procedure's input and returns its output; give it a value for every state
  the screen draws, not only the happy one.
- A plugin supplies the fixtures of the procedures it owns: with `auth`, `auth.session` answers a
  signed-in user, so every screen behind the session guard draws its signed-in form and the app
  writes fixtures for its own procedures only. The app overrides any of them in
  `src/app/fixtures.ts` (a procedure is answered from the app's fixtures first, then the
  plugins'): give `auth.session` a `() => null` to draw the signed-out form, or another user to
  draw a role.

A screen that reads over plugin-node's WebSocket (`channelRead`) is answered from the third argument of `defineFixtures`, `channels`: a map from a channel's name to a fixture that takes the route params and returns the channel's opening reply, sent as the reply to its subscribe. A bare value is the payload of the channel's `snapshot` message; a channel that opens with another message (`status`) returns `{ type: "status", payload }` naming it (exactly those two keys; a snapshot shaped that way cannot be sent bare). Type it with plugin-node's `Snapshots` over a map of the channel definitions, whose keys are the channels' names. A channel with no fixture sends nothing, logs `no fixture for channel <name>` and fails the story in the test run, as a procedure with none does. The states apply as for reads: data sends the frame, loading holds it until the test run releases it, empty sends its payload emptied by the rule above, and error closes the socket, the only failure the protocol has apart from an app-defined message (the client backs off, and after two seconds the channel's read draws its paused line); the protocol has no not-found frame, so not found sends the frame as data.

```ts
export default defineFixtures<
  AppRouter,
  Snapshots<{ notes: typeof notesChannel; sync: typeof syncChannel }>
>(
  { projects: { list: () => [] } },
  { projectId: "acme-web" },
  {
    notes: () => ({ items: [] }), // the payload of notes' snapshot
    sync: () => ({ type: "status", payload: { state: "idle" } }), // sync opens with status
  },
);
```

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
- a call the fixtures could not answer (no fixture, or a fixture that threw);
- a shift of the loading story (below);
- any of these with one read failed (below).

A failure names the screen, the state and the mode. A screen is drawn in five states and two modes
(light and dark), and the run visits each at the three widths.

A story that holds no calls (data, error, empty, not found) is judged and shot by the same rule, so an error story shows the failed form: a failed query stays fetching through the client's one retry (about a second).

A part that lays itself out after its first paint (the Canvas measures, runs its layout, then fades in) marks itself `aria-busy` until it is drawn, so the run waits for it before it judges and shoots. Storybook's test run pauses the animations once the story's play ends, so the run plays the paused finite ones to their end before each shot: a part that fades in late is shot shown, never hidden.

### The loading shift

A Section stands whatever its data holds, so the page must not jump when the data arrives. In a
Loading story the run measures each Section at each width while the calls are held, answers them,
waits until no query is fetching and nothing is `aria-busy` (a button's own busy excepted) and the page has settled, and
measures again. Per Pane, each Section is judged against the Sections above it in its column (those whose horizontal extent overlaps its own and whose top is above its top), never against a Section beside it, so a two-column layout's columns are judged apart. It reports:

- a Section that stood while waiting and is gone loaded (Sections pair between the two forms by slot, their position among the Sections of their column, never by title: a Section titled by its record paints a filler waiting and the record's title loaded; the loaded form may draw more Sections in a column than the waiting one, and those below the paired ones are not findings);
- a Section with none above it in its column moving by other than what the text above it grew by (the head's name, facts or description, or prose, wrapping to more lines; in a column the page centres (a Gate's) the Section also moves by half of what the column's height changed by; any other change above it, a toolbar, a bar or a tabs row changing height, fails);
- a Section with some above it in its column moving by other than what the Sections above it in its column grew by;
- a Section changing height with no rows, chart or text in it, in either form.

A Pane with no Section is measured by the tops of its body's direct blocks, judged alike. A move
that a block caused, one absent while waiting and present loaded above the moved one (a Banner that
stands only with its data), by at least its height, is reported and not failed; every other finding
fails the screen. The fix is in the screen's outline, never in the paint, which is the
loaded form already at the loaded heights: give every Section a `read`, put a Banner or a PendingBar
whose condition lands with the data where it reads best (what is under it moves once, which is
reported), and keep a text that wraps short enough to wrap the same painted and loaded.
A screen that draws one Section per record draws one painted Section while the list waits (never `PAINT_ROWS`-many: a waiting Section the loaded form lacks fails, and a Section is a titled stretch, where `PAINT_ROWS` paints the rows of one sheet).
`shift.ts` holds the measurement and `compare`.

### Each read failed

A screen with one read failed is a state the five do not reach: the error story fails every query at
once, so a frame that holds a read nobody else does never meets it alone. After the Data story's
floors, when the screen called two or more procedures, the run fails each procedure in turn and
draws the screen again:

1. the procedure's queries answer a server error and every other procedure answers its fixture;
2. those queries reset (on the procedure and on the one failed before it, which answers data
   again) and fetch again;
3. once no query is fetching (a failed one stays so through the client's retry), nothing is busy and the page has settled, the horizontal overflow and the render walk run
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

Four more rules are `align-*`. They fail a run like the rest (`ALIGN_FAILS` in `walk.ts` is true);
`alignFindings()` returns them alone.

| Rule | A finding is |
| --- | --- |
| `align-dead` | a box in the flow, wider and taller than half a pixel, that draws nothing: no text, background, border, shadow or outline, no picture or control, nothing inside that draws (the empty end square of a row). Out-of-flow boxes, a window's spacer (`data-spacer`), pictures, controls, table cells and fully transparent boxes are not found |
| `align-centre` | a row (a flex row with a row role, or the floor of a row token; a flex column that is one, a definition row, is measured on its first flex-row child, its label line, whose centre is the row's here) whose end items, the drawn leaves beside its label, beyond its right edge and not in the text group below its first line, are more than 1 px off the row's vertical centre (a value on the label's line beside a chevron on the row's middle) |
| `align-baseline` | two bare texts of different sizes on one flex-row line whose baselines differ by more than 1 px (a count centred by its line box beside a heading). Texts inside a painted box or a control, an item of two lines and a nested row's own texts are left out |
| `align-grid` | any element whose computed `display` is `grid` or `inline-grid`: the layout is flex alone, so the phone mirrors it. The grids structure rule 1 allows are excepted, each by the element itself and never what it holds: the run of rows (`ROWS`, a sheet's or a Form's two-column grid, `grid-cols-[auto_minmax(0,1fr)]`) and the subgrid on a definition row and the one on a form's group (`grid-cols-subgrid`) |

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

### Screenshots

`--shots <dir>` saves a PNG of every story the run visits, at each width, once the floors at that
width ran: `<dir>/<screen>/<story>-<width>.png`, for example `shots/projects/$id/data-dark-1280.png`.
The directory is resolved from the app's root and lies inside it (Vitest writes a screenshot only
within the workspace Vite serves; gitignore it), and the default mode's story has no mode in its name
(`data-1280.png`). The narrowing flags choose the images, so one picture per screen and state is
`stack screens test --all --mode light --width 1280 --shots shots`. To look at one screen after an
edit, name it and one of each: `stack screens test --screen deploys --state data --mode light
--width 1280 --shots shots`. The run ends by listing the absolute path of every shot it wrote.

- A shot is the whole screen: the viewport grows from 800 px until no scroller (the document or a
  pane that scrolls on its own) hides anything, up to 16384 px.
- A loading story's shot is its waiting form.
- A run writes over the files it takes and leaves the others; empty the directory first for a set
  from one run alone.
- The shots are taken whether or not the screen passes its floors.

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
- An open non-modal popup (a Menu, a Picker, a Pane's more menu) is judged like the
  rest of the page: the roster takes `aria-hidden` off Base UI's focus guards, so axe's
  `aria-hidden-focus` has nothing to flag and nothing is excluded.
- The session is one fixed signed-in user with no app-specific session fields, and there is no
  signed-out state.

**Check:** `stack screens dev` lists the new route with its five states, each drawing as
designed, and `stack screens test` and `pnpm check` pass.
