# Design critique

A critique judges one rendered unit (a component frame in stack's showcase, or a screen an app
composed from the roster) against the [rubric](./rubric.md) and reports findings with measured
numbers. The critic is a fresh session that played no part in composing the unit; it never
prescribes a look and never edits a file: it says what is off and by how much. Its own
measurements are the only machine numbers on a render and never evidence of taste.

## What the critic needs

The URL that renders the unit (a showcase frame, or the app's dev server route), the patterns it
implements, the states it declares and how to reach each (a route, a fixture, a control), the
references it was built from, and the files that draw it. Open the rubric, the
[judging](./judging.md) page, and the page under `patterns/` of each of those patterns only. A
unit that cannot be opened in a browser is reported as unrendered with the reason, never judged
from source.

## Procedure

Every render, in this order, in a browser the critic can script.

1. **Prepare.** Open the URL. Set `prefers-reduced-motion: reduce` and inject
   `*{transition:none!important;animation:none!important}`. Park the pointer off-screen and clear
   the console.
2. **Measure** the rubric's system constants and each pattern page's range. Read the computed styles of
   the unit's elements: the font sizes and weights in use, row and control heights, radii, border
   colours and widths, shadows, each layer's surface colour, every occurrence of the accent. Each
   value outside its range is a finding with the measured number and the range.
3. **Interact.** Click every control, hover every row, tab through in order. Screenshot rest,
   hover, focus, active, disabled, loading, empty, error and selected wherever the unit declares
   them. A declared state with no visible change is a finding, and so is a loading form whose
   height differs from the loaded one.
4. **Widths.** 1280 and 390 px, plus 768 and 1440 for a screen; 390 draws the touch density.
   Horizontal overflow, clipped text, a control under 24 px, or a touch target under 44 px at 390
   is a finding.
5. **Modes.** Repeat steps 2 to 4 in dark mode, through the page's mode control or the `dark`
   class on the root. Dark is a calibration, not an inversion: check the surface steps and the
   hairline's lightness.
6. **Floors.** On the composited render, in both modes and every declared state, measure each
   floor the rubric's floors section sets, with its carve-outs: text contrast, the contrast of
   control boundaries, focus rings and icon-only controls, target size and spacing,
   `scrollWidth` against the viewport at 320, 390, 768, 1280 and 1440, and Tab reaching every
   control with a visible focus. Report each as the measured value beside its floor; one under
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
9. **Console.** Zero errors or warnings, else a finding.

## Report

```
verdict: ship | rework | reject
unit: <what was rendered, URL, widths and modes covered>

blockers   (a ban, a floor missed, a constant or range missed by more than 20 %, an invisible state, overflow, a console error)
rework     (a number outside its range, a hygiene miss, a judged finding)
nits       (within range but at its edge, or a judged remark below rework)

each line: <file:line | screenshot | measurement> · <measured value> vs <range> · <one sentence>
```

The verdict follows the rubric's verdict section. Approve only on what was rendered, never on
the author's word.
