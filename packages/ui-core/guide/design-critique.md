# Design critique

A critique judges one rendered unit (a component's story in stack's Storybook, or a screen an app
composed from the roster) against the [rubric](./rubric.md) and reports findings with measured
numbers. The critic is a fresh session that played no part in composing the unit; it never
prescribes a look and never edits a file: it says what is off and by how much. Its own
measurements and `stack screens test`'s result are the only machine numbers on a render and never
evidence of taste.

## What the critic needs

The URL that renders the unit (a Storybook story, `iframe.html?id=<story id>&viewMode=story`, a
screen of the screens workbench among them, the app's dev server route, or a phone route's deep link), the patterns it implements, the states it declares and how to reach each (a route, a
fixture, a control), the references it was built from, and the files that draw it. Open the
rubric, the [judging](./judging.md) page, and the page under `patterns/` of each of those
patterns only. A unit that cannot be opened in a browser or on the emulator is reported as
unrendered with the reason, never judged from source.

## A phone screen

A phone screen is judged on the Android emulator, built, booted and started by the expo guide's
[render page](node_modules/@fcalell/plugin-expo/guide/phone-render.md), with `stack dev` and
`stack expo dev` running, and captured as its
[capture page](node_modules/@fcalell/plugin-expo/guide/phone-capture.md) says. The critic gets
the route as a deep link, opens it with Maestro's `openLink`, and drives it with Maestro flows
(`tapOn`, `scrollUntilVisible`, `extendedWaitUntil`, `waitForAnimationToEnd`,
`takeScreenshot`), one flow per state walk, since each Maestro call costs about 20 s. The procedure's steps read as follows on the phone.

1. **Prepare.** The animation scales at 0 (the system's reduced motion), set before the app
   starts; force-stop the app, then open the route. Every screenshot follows an
   `extendedWaitUntil` on a known text and a `waitForAnimationToEnd`: the first frames after a
   launch arrive seconds late.
2. **Measure.** `maestro hierarchy` gives each element's bounds in px, its text, its
   accessibility label, and whether it is clickable, checked or selected. A size in dp is
   px × 160 / the density `adb shell wm density` reports. Colours and contrast ratios are read
   from the screenshot's pixels with the phone shell's ImageMagick, as the capture page shows.
   Font size, weight, radius, border and shadow are not in the hierarchy: read them from the
   component's cell in `DESIGN.md`, and measure a radius or a hairline on the screenshot.
3. **Interact.** Tap every control and scroll every list in a flow, with a screenshot after each
   state the unit declares; a toast is judged from that screenshot, since it is gone before
   `maestro hierarchy` returns. A touch screen has no hover, and a pressed state is not captured.
4. **Widths.** 390 and 320 dp, set live through the density on the 1080 px panel
   (density = 1080 × 160 / width: 443 and 540), with no relaunch. An element whose bounds pass
   the screen's edge, or clipped text, is a finding, and so is a target under 44 dp for a primary
   act or under 24 dp otherwise.
5. **Modes.** `adb shell cmd uimode night yes`, then `no`, and repeat steps 2 to 4. The app
   follows the system mode while it runs.
6. **Floors.** As on the web, from the pixels and the bounds, except that keyboard reach becomes
   an accessible name (text or accessibility label) on every clickable element, and overflow is
   bounds past the screen's edge.
7. **Judge** and 8. **Hygiene** as on the web, by the phone's rules page.
9. **Console.** Metro's output, where the app's JavaScript logs arrive, shows zero warnings
   and errors, except Reanimated's "Reduced motion setting is enabled" warning, which the
   harness's own reduced motion raises.

## Procedure

Every render, in this order, in a browser the critic can script; a phone screen on the emulator,
each step read as [A phone screen](#a-phone-screen) says. A web screen's `stack screens test`
result is read first: a failing run is a blocker, and the critic measures none of what it
measures (every axe rule, text contrast among them; horizontal overflow at the five widths;
target size and spacing; console output).

1. **Prepare.** Open the URL. Set `prefers-reduced-motion: reduce` and inject
   `*{transition:none!important;animation:none!important}`. Park the pointer off-screen and clear
   the console.
2. **Measure** the rubric's system constants and each pattern page's range. Read the computed styles of
   the unit's elements: the font sizes and weights in use (sizes are counted as distinct pixel sizes, never as size and weight pairs: 16/400 and 16/500 are one size), row and control heights, radii, border
   colours and widths, shadows, each layer's surface colour, every occurrence of the accent. Each
   value outside its range is a finding with the measured number and the range.
3. **Interact.** Click every control, hover every row, tab through in order. A story draws a
   component in its prop states (rest, disabled, loading, empty, error, selected) and never a
   pointer or focus look: the critic reaches hover, press and focus by driving the real component
   in the story (move the pointer onto it, press and hold, Tab to it). Screenshot rest, hover,
   focus, active, disabled, loading, empty, error and selected wherever the unit declares them. A
   declared state with no visible change is a finding, and so is a loading form whose
   height differs from the loaded one, except a collection of unknown length: it waits with a
   fixed number of rows; the list's height may change only by the difference in row count: each
   waiting row matches its loaded row's height and text start, measured row by row, and any
   per-row difference is a finding; a loaded row whose text wraps grows by its wrapped lines, its
   waiting row matching its one-line form.
4. **Widths.** 1280 and 390 px, plus 768 and 1440 for a screen; 390 draws the touch density.
   Clipped text, or a primary act under 44 px at 390, is a finding.
5. **Modes.** Repeat steps 2 to 4 in dark mode, through the page's mode control or the `dark`
   class on the root. Dark is a calibration, not an inversion: check the surface steps and the
   hairline's lightness.
6. **Floors.** On the composited render, in both modes and every declared state, measure each
   floor the command does not measure, with the rubric's carve-outs: the contrast of control
   boundaries, focus rings and icon-only controls, the 44 px primary act on touch, and Tab
   reaching every control with a visible focus. Report each as the measured value beside its floor; one under
   its floor is a blocker.
7. **Judge** type, hierarchy, structure, colour, motion and composition by the judging page,
   and the rubric's bans. Each finding cites a screenshot and an element.
8. **Hygiene.** In the files that draw the unit: `focus-visible` present and no `outline: none`
   without a replacement; `min-w-0` on flex children that truncate; long text truncated or
   wrapped on purpose; `tabular-nums` on numbers compared in columns; an accessible name on every
   icon-only control; links are anchors; no `transition: all`; only `transform` and `opacity`
   animate; `prefers-reduced-motion` honoured without a global kill; `color-scheme` set for
   dark; `overscroll-behavior: contain` on overlays; skeletons mirroring the final layout; empty,
   dense and very long content handled; `…`, never `...`; no `user-scalable=no`. On an app
   screen, also the platform's rules page: no class, `style` or look at a call site outside an
   intrinsic host's geometry, and no raw element rebuilding a shape a roster component owns.
## Report

```
verdict: ship | rework | reject
unit: <what was rendered, URL, widths and modes covered>

blockers   (a ban, a floor missed, a failing `stack screens test`, a constant or range missed by more than 20 %, an invisible state)
rework     (a number outside its range, a hygiene miss, a judged finding)
nits       (within range but at its edge, or a judged remark below rework)

each line: <file:line | screenshot | measurement> · <measured value> vs <range> · <one sentence>
```

The verdict follows the rubric's verdict section. Approve only on what was rendered, never on
the author's word.
