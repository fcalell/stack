# The screens workbench

The workbench draws every route of the web app, one screen per route, in each state its queries
can take, from fixtures and with no backend running. Open it while designing or changing any
screen, and again before calling the screen done: a screen is done when all five states look
right. A default look is `--mode dark --width 320,1920`, the two widths and the mode a screen is
looked at in; the run's other widths and mode are the machine's. The app writes no story, harness or workbench config; a new route is a new screen on its own.

```bash
stack add screens   # once: installs the workbench and its packages into the app
stack screens dev   # serves the workbench (--port 6006)
stack screens test  # checks the screens a changed file reaches; narrow it with --screen, --state, --width, --mode; --shots <dir> saves a PNG of each (see The test run)
stack screens shoot --url <app> --route /,/x   # opens routes of a live app, shoots and judges each (see Driving a live app)
stack screens drive <plan.json> --url <app>    # runs a plan of steps in a live app (see Driving a live app)
stack screens serve [--entry <file>] [--keep]   # runs the real server on a scratch database, seeded (see The seeded server)
stack screens browser [stop]                   # starts or ends the shared Chrome (see The shared browser)
```

Requirements, day one: the commands that draw need a Chrome or Chromium: `CHROME_PATH` naming
one, else `chromium`, `google-chrome` or `google-chrome-stable` on PATH; without one they fail
with a line that says so. Nothing is downloaded. The host is
Storybook 10 and Vitest 5, which `stack add screens` installs.

### The shared browser

Every command drives one headless Chrome per machine, over the DevTools protocol. Its address
(`{ port, pid }`) is `chrome.json` in `$XDG_RUNTIME_DIR/stack/` (the OS tmp dir without it). A
command connects to it, or starts it under a lock when none runs, so two commands at once share one
Chrome; a stale file (a dead pid, a port that does not answer) is replaced. Each command opens its
own browser context and its tabs inside it, and disposes the context when it ends, on failure and
on SIGINT or SIGTERM, so commands share the browser and nothing else. A browser a command started
closes when the last context is gone. `stack screens browser` starts one that stays, for a
session of many short commands; `stack screens browser stop` ends it. Every protocol call has a
timeout and names its method when it fails.

## The states

Each route has five states: **data**, **loading**, **error**, **empty** and **not found**. The
toolbar sets the mode (light, dark) and the density (desktop, touch) for the screen in view.
Draw each state in the screen itself (the screen recipe,
`node_modules/@fcalell/ui-core/guide/screen.md`); the workbench only reaches them.

A forced state applies to every query the route makes, except the session read (`auth.session`: the
frame's precondition, not the screen's read) and the frame's scope and org-rules reads, which
answer data in every state whoever supplies the fixture, the app's own session answer included. A
mutation and a plugin-owned procedure always answer from their fixture, whatever the state; the
app's own fixture for any other procedure a plugin owns overrides the plugin's and follows the
state like any app read.

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
- A route that reads its search (the router's `useSearch`, `location.searchStr`; never
  `window.location`, which a story's memory history does not set) is drawn at the example search
  the fourth argument gives, after the channels: `defineFixtures<AppRouter>(procedures, params,
  channels, "?token=abc")`, with or without the `?`, on every screen.
- A fixture takes the procedure's input and returns its output; give it a value for every state
  the screen draws, not only the happy one.
- A plugin supplies the fixtures of the procedures it owns: with `auth`, `auth.session` answers a
  signed-in user, so every screen behind the session guard draws its signed-in form (with `devices: true`, `auth.devices.list` answers three keys, `create` a
  new one with its key and `revoke` succeeds; the sign-in steps, `signOut`, `user.update`, the organization list, create, delete, `setActive` and `invitations.create`, and with `mcp: true` `oauth.client` and `oauth.consent` answer too) and the app
  writes fixtures for its own procedures only. The app overrides any of them in
  `src/app/fixtures.ts` (a procedure is answered from the app's fixtures first, then the
  plugins'): give `auth.session` a `() => null` to draw the signed-out form, or another user to
  draw a role. The session read is never forced into a state, so an app's own answer holds in every
  story, and an Error story still draws the screen's failure behind a signed-in guard.
- An app that needs a session of its own (an `activeOrganizationId`, so a screen that reads the
  active organization draws instead of calling `auth.organization.setActive`) starts from the
  plugin's answer rather than writing a user and a session field by field. The plugin's fixtures
  module is a public subpath and its `auth.session()` returns the signed-in `{ session, user }`:

  ```ts
  import authFixtures from "@fcalell/plugin-auth/screens-fixtures";

  const { session, user } = authFixtures.auth.session();
  // in the procedures of defineFixtures:
  auth: { session: () => ({ session: { ...session, activeOrganizationId: "org_1" }, user }) },
  ```

  The answer is typed by the procedure, so a field the session does not have fails there.

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
Loading story the run measures each Section at each width while the calls are held (and the reads
it does not hold, a mutation or a frame route, have landed and drawn: no query fetching beyond the
held ones, for a few frames running, then the size settled), answers them,
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
A docked Sheet and a modal Sheet's dialog are regions as a Pane is: their Sections are judged
against each other, and the Sheet's own head (its title and description wrapping or growing) credits the
first of them. A failure of the first Section says how much of its move the text's growth explains and
how much is left (`62px of it the text's growth, -6px unexplained`): what is left is another block above
it changing height (a Stats strip's painted rows, a tabs row), never the head's own growth.
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
| `control-height` | a button, field, switch, combobox, tab or checkbox whose height is no size (control, target, row, icon-control) or formula over sizes a recipe spells (a one-time-code box's body line and two pads); where it sets a floor (`min-h-*`), a floor that is no token, or a height under it |
| `row-height` | a row, option, menu item or tree item under the row floor |
| `gap`, `inset` | a flex or grid container's gap or padding that is neither 0 nor a spacing token |
| `radius` | a corner that is no radius role or pill |
| `nested-radius` | a box inside a rounded box with an inset smaller than the outer radius whose radius is not the outer less the inset |
| `clip` | a box that clips (`overflow` hidden or clip) with more inside than it shows and no ellipsis or line clamp |
| `font-late`, `font-failed` | a font face still loading at the screen's first frame, or failed. A family's metric fallback face ("IBM Plex Sans Fallback", a `local()` system font the browser loads only for a glyph the family lacks, such as "→") is left out: a host without that system font fails it and the platform stack draws the glyph |
| `tabular-digits` | a text that is only a number (digits with separators, a sign, a percent, a currency symbol or a unit of up to three letters) in a proportional face without `tabular-nums` |
| `region-name` | a landmark region inside another of the same accessible name |
| `table-pane` | a Table's grid in a Pane that is not `wide` (it holds the list's room, so set `wide` on it), or in a `wide` Pane that is its Place's last with another Pane standing and not covered before it (`wide` takes the room only while not last: the Pane before gives way, or the Pane with the Table takes `cover`) |
| `canvas-open` | a canvas, once it shows, with a node (`data-node`: its card, or its glyph under the text floor) cut at the pane's start by more than a pixel, or standing under its zoom stack. The pane's far side may cut a node where the graph is wider than the overview's floor holds, so it is not read; a node wholly outside the pane is the viewer's to pan to |
| `text-covered` | a visible text with a point on one of its lines under a box that is no relative of its element and draws there: a background, a picture, its own glyphs, or the edge of its border, outline or ring (a Banner's act standing over the last line of its sentence). The walk brings each text into view, samples points across its line boxes (`Range.getClientRects`, about every 12 px along and 3 px down) and reads them with `document.elementsFromPoint`, then puts the scroll back. Not covers: a box in a dialog, menu, listbox, tooltip or popover layer, a sticky box, a box that draws nothing at the point (a transparent overlay, a hit area), and a text that draws nothing itself (transparent ink or opacity 0, as a label held under a spinner). While a modal is open, the page behind it (and anything `inert`) is not read. A `pointer-events: none` layer is not in the hit test, so a decoration that lets the press through is not read |

Four more rules are `align-*`. They fail a run like the rest (`ALIGN_FAILS` in `walk.ts` is true);
`alignFindings()` returns them alone.

| Rule | A finding is |
| --- | --- |
| `align-dead` | a box in the flow, wider and taller than half a pixel, that draws nothing: no text (white space counts where the box preserves it, as a code line's indent), background, border, shadow or outline, no picture or control, nothing inside that draws (the empty end square of a row). Out-of-flow boxes, a window's spacer (`data-spacer`), pictures, controls, table cells and fully transparent boxes are not found |
| `align-centre` | a row (a flex row with a row role, or the floor of a row token; a flex column that is one, a definition row, is measured on its first flex-row child, its label line, whose centre is the row's here) whose end items, the drawn leaves beside its label (a waiting row's label is its first filler, as the loaded row's is its first text), beyond its right edge and not in the text group below its first line, are more than 1 px off the row's vertical centre (a value on the label's line beside a chevron on the row's middle) |
| `align-baseline` | two bare texts of different sizes on one flex-row line whose baselines differ by more than 1 px (a count centred by its line box beside a heading). Texts inside a painted box or a control, an item of two lines and a nested row's own texts are left out |
| `align-grid` | any element whose computed `display` is `grid` or `inline-grid`: the layout is flex alone, so the phone mirrors it. The grids structure rule 1 allows are excepted, each by the element itself and never what it holds: the run of rows (`ROWS`, a sheet's or a Form's two-column grid, `grid-cols-[auto_minmax(0,1fr)]`) and the subgrid on a definition row and the one on a form's group (`grid-cols-subgrid`) |

The walk leaves out what is not drawn: `display: none`, `visibility: hidden`, `aria-hidden`, a box under
a pixel wide or high, and what a pixel-wide clipping box holds. The headings it counts (`heading-one`,
`heading-order`) are the ones a reader gets: a heading under `display: none`, `aria-hidden` or `inert` is not
one, except while a modal Sheet is open, which hides the page behind it and leaves the page's own `h1`
the page's. It sees through `display: contents`.
Its named exceptions are listed in one place, `EXCEPTIONS` in plugin-screens' `walk.ts`, each with
its reason; a finding is fixed in the component or the screen, never baselined.

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
| A new screen | all its states, the default look: `--screen <it> --mode dark --width 320,1920` |
| ui-core's tokens or theme, the app's CSS, a frame component (Shell, Place, Pane, Section) or a dependency bump | the screens you are working on, `--screen a,b`; never every screen as a gate |

Combine the rows: a loading change on one screen's touch tree is
`stack screens test --screen deploys --state loading --width 320 --mode light`.

### Screenshots

`--shots <dir>` saves a PNG of every story the run visits, at each width, once the floors at that
width ran: `<dir>/<screen>/<story>-<width>.png`, for example `shots/projects/$id/data-dark-1920.png`.
The directory is resolved from the app's root and lies inside it (Vitest writes a screenshot only
within the workspace Vite serves; gitignore it), and the default mode's story has no mode in its name
(`data-1920.png`). The narrowing flags choose the images, so one picture per screen and state is
`stack screens test --all --mode dark --width 320,1920 --shots shots`. To look at one screen after an
edit, name it and one of each: `stack screens test --screen deploys --state data --mode dark
--width 320,1920 --shots shots`. The run ends by listing the absolute path of every shot it wrote.

- A shot is the viewport, 800 px tall. `--full` grows it to the whole screen: the viewport grows
  from 800 px until no scroller (the document or a pane that scrolls on its own) hides anything, up
  to 16384 px.
- A loading story's shot is its waiting form.
- A run writes over the files it takes and leaves the others; empty the directory first for a set
  from one run alone.
- The shots are taken whether or not the screen passes its floors.

### Opening a popup, a search for a filter

- `--open <control text>` presses, once a story has drawn, the control whose visible text or accessible
  name is that text (with real mouse input after a hit test), waits for what it opens to settle, then
  runs the floors and takes the shot with it open, named `<story>-<width>-open-<slug>.png`; Escape
  closes it. A Menu, a Picker, a Dialog or a Sheet is then judged and seen. A screen that draws no such
  control fails, naming it: narrow the run with `--state` to the states that draw it.
- `--search <query>` draws every screen at this search in place of the fixtures' example, so a filter-on
  empty form is drawn: `--screen deploys --state empty --search "?q=x"`. An empty value draws none.

### Driving a live app

`shoot` and `drive` open a running app (any URL: `stack dev`, a built bundle, a deploy) in the shared
browser. The page is drawn with reduced motion and a device scale of 1, at each width and mode, with
touch input and a coarse pointer under 768 px. They judge what the test run judges, on the live page:
horizontal overflow, the render walk and axe (the same page code, bundled from `src/ui/`), print
the findings like the test run and exit non-zero on any.

```bash
stack screens shoot --url http://localhost:3000 --route /,/deploys --width 320,1920 --mode dark \
  --shots shots --open "Invite" --cookie session=abc
```

`shoot` waits until a page is quiet (no request in flight, nothing `aria-busy`, at most `--settle` ms,
10000 by default; an event stream, an `EventSource` and a response whose headers came 1.5 s ago and whose
body is still open are held by design and do not count; a page still busy at the cap is shot and the run
prints a note, which does not fail it), then writes `<dir>/<route-slug>-<width>-<mode>.png` (`/` is `index`; the default
directory is `.stack/shots`; `--full` grows the shot as above; `--open` adds a shot per route with the
control pressed). Defaults: widths `320,1920`, mode `dark`. A guarded route needs a session:
`--cookie name=value` sets one, `--sign-in <url>` opens a URL first in the same context, which sets it.

`drive <plan.json>` runs a plan once for each viewport of `each` (default 320 and 1920, dark):

```json
{ "each": [{ "width": 320, "mode": "dark" }],
  "steps": [{ "goto": "/" }, { "fx": "/api/code" }, { "open": "Invite" }, { "type": "{{fx}}" },
            { "shot": "invite" }, { "key": "Escape" }, { "scroll": 400, "in": "main" }] }
```

| Step | Does |
| --- | --- |
| `goto` | opens a path of the app and waits until quiet |
| `open` | presses the control with this text or accessible name: real mouse (touch under 768 px) input after a hit test, then waits until quiet |
| `key` | one key: `Enter`, `Escape`, `Tab`, `Backspace`, `Delete`, `Space`, an arrow, `Home`, `End`, `PageUp`, `PageDown`, or one character |
| `type` | types text into the focused element |
| `fx` | GETs a path of the app from the page; its text answer is `{{fx}}` in later steps |
| `shot` | judges the page and writes `<name>-<width>-<mode>.png` |
| `offline` | `true` or `false`: the network off or on |
| `scroll` | sets `scrollTop` of the page, or of the element `in` names (a CSS selector) |

A step of any other kind, with two kinds in one object, or with a value of the wrong type fails the plan
before it runs.

## The seeded server

Fixtures are the answers the workbench draws with no server. `stack screens serve` is the second
source: the app's real server, on a scratch database, with data a seed made through real procedures.

| Source | Use it for |
| --- | --- |
| Fixtures (`src/app/fixtures.ts`: `dev`, `test`) | The gate and the five states: every route in loading, error, empty, not found and data, each judged with nothing running |
| The seeded server (`serve`, then `shoot --url`, `drive --url`) | What the server makes of a state (a list the real query sorted, a count it computed, a row it refused) and acts (a mutation that writes and the screen that reads it back) |

```bash
stack screens serve                                   # prints: stack screens serve: http://localhost:43379
stack screens shoot --url http://localhost:43379 --sign-in http://localhost:43379/fixture/link --route /library
```

The command builds the web client and a scratch database from the committed migrations, seeds it
from `src/schema/seed.ts` as every database is, starts the server on a free port, runs the app's seed,
prints the one line and stays in the foreground. Ctrl-C (or SIGTERM) stops it and deletes its
scratch directory in the OS tmp dir, which `--keep` leaves; `{ url, pid }` is `serve.json` in it.
Two runs at once never collide. A database without a committed migration fails the run: `stack db
generate` first.

The app's seed is `src/app/seed.ts`, run once the server answers. `client` is the app's typed API
client, signed in as the fixture member, so a seed goes through the procedures the screens call:

```ts
// src/app/seed.ts
import { defineServeSeed } from "@fcalell/plugin-screens/serve";
import type { AppRouter } from "../../.stack/worker";

export default defineServeSeed<AppRouter>(async ({ client, url, fx }) => {
  await client.projects.create({ name: "Acme" });
});
```

`dir` is the run's scratch directory, removed when the run stops. `fx(path)` GETs a path of the served app and answers its text. A seed that throws stops the run
with its error. The fixture member signs in by email code, so an app whose sign-up is closed seeds
that member's user in `src/schema/seed.ts`.

The served app answers four controls under `/fixture`, which exist only under `serve`:

| Path | Does |
| --- | --- |
| `/fixture/delay?match=<pattern>&ms=<n>` | Slows each request whose path holds the pattern (`*` is any run); `ms=0` clears it |
| `/fixture/fail?match=<pattern>&status=<n>` | Answers each such request with that status; `status=0` clears it |
| `/fixture/socket?close=1` | Closes the WebSockets of the session the request holds (a Node server) |
| `/fixture/link[?to=/path]` | Signs the browser in as the fixture member and redirects: `shoot --sign-in <url>/fixture/link` |

`drive` plans reach them with an `fx` step. An app's own controls (a clock, a reset) wrap the same
worker: `fixtureControls(worker, extra)` from `@fcalell/plugin-screens/serve`, where `extra(request,
{ env, ctx })` is asked first of every `/fixture/*` path, so it can answer a generic one (an app with its own sign-in links supplies `link`), and returns undefined to pass to the generic controls.

`--entry <file>` is for a server that needs fakes injected (its own `startNodeServer`, a fake
adapter). The command still owns the directory, the port and the printed line, and runs the file
with `STACK_SERVE_DIR` and `STACK_SERVE_PORT` set; the file puts its state in that directory,
listens on that port, and wraps its worker with `fixtureControls` (a Node server lists
`fixtureSockets` of `@fcalell/plugin-node/serve` in its `services` for the socket control).

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
- The plugin's session is one fixed signed-in user with no app-specific session fields, and there
  is no signed-out state; an app's own `auth.session` fixture (above) changes both.

**Check:** `stack screens dev` lists the new route with its five states, each drawing as
designed, and `stack screens test` and `pnpm check` pass.
