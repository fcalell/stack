# Judging a render

The questions a [design critique](./design-critique.md) asks once a unit clears the
[rubric](./rubric.md)'s constants, its floors and its patterns' ranges. Each answer is a finding
that cites a screenshot and an element, or nothing.

## Pattern ranges

A unit is measured against the range on the page of each pattern it implements
(`patterns/<pattern>.md`); a value outside the range is a finding with the measured number and
the range. Where a range names a dialect, the system's own rule holds and the references' number
is not a finding: labels draw at the body role (13), emphasis is weight 500, a title or heading
is the system's role, the focus ring is the system's 2 px ring: a field's box rings centred on its 1 px edge for the keyboard alone (a click draws the hover edge, no ring), every other control 2 px outside its edge, and the rubric's accent
carve-outs (a checked control, the `active` dot) apply inside every pattern.

## Type

An obvious scale with at most six sizes on a screen; sizes are distinct pixel sizes, so weights add none, and a density keeps the count (desktop and touch draw six at most, touch's page roles stand at 22, 18, 16, 15 and 14); display ≥ 2.5× body where a display role
appears; measure 45–75 ch where the column is wider than the text's natural measure (a phone
column is exempt: the column sets the measure, body never shrinks to reach it); tracking never
below −0.04 em; body never below 12 px at any density; one sans for UI, mono only for what a
machine reads.

## Hierarchy

Three ink levels carry it; no fourth grey; colour never carries hierarchy.

## Structure

Hairlines and surface steps separate regions; fills mark selection and data only; more than one
radius and more than one shadow in the system, each spent by role, never one stamped on every
block.

## Colour

Chrome achromatic or hued on purpose, never a pure mid-grey; accent in one place per screen (acts,
selection, focus, links); status and chip hues fixed per family; dark mode its own calibration.

## Motion

Motion explains a change: where a thing came from, where it went, that a press landed, that a
wait is live. Each motion answers one of those, or it is decoration and goes. One duration scale
and one easing set time all of it; 150–300 ms for a micro-interaction that moves something, press
feedback may be shorter (100 ms), and nothing outlasts the slow rung but a loop that marks a live
wait.

What may animate is a question of cost, not taste. `transform` and `opacity` run on the
compositor; colour, `clip-path` and `filter` repaint the one element and may transition too (a
state's fill easing in, a reveal). A box's size or place never animates through layout (`width`,
`height`, `top`, `left`, a margin, a padding, a grid track): it changes by a transform or a view
transition, which move the drawn box while layout lands at once. Never `transition: all`.

A screen may hold several motions, each on its own part, but they never compete: the settle, the
switch from the painted form to the loaded one, is the page's one large motion (each frame
moves by a transform from its old place to its new and the page fades), and what enters or
leaves inside it rides that one transition. Under reduced motion every transition snaps; a loop
that is the only sign a wait is live stays, slowed or stilled to a form that still reads as live.

## Composition

One focal point per screen; the page has an owner (a frame molecule); nothing floats; empty space
is intentional.
