# Judging a render

The questions a [design critique](./design-critique.md) asks once a unit clears the
[rubric](./rubric.md)'s constants, its floors and its patterns' ranges. Each answer is a finding
that cites a screenshot and an element, or nothing.

## Pattern ranges

A unit is measured against the range on the page of each pattern it implements
(`patterns/<pattern>.md`); a value outside the range is a finding with the measured number and
the range. Where a range names a dialect, the system's own rule holds and the references' number
is not a finding: labels draw at the body role (13), emphasis is weight 500, a title or heading
is the system's role, the focus ring is the system's 2 px ring, and the rubric's accent
carve-outs (a checked control, the `active` dot) apply inside every pattern.

## Type

An obvious scale with at most six sizes on a screen; display ≥ 2.5× body where a display role
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

One duration scale, one easing set, one authored moment per screen at most; 150–300 ms for
micro-interactions that move something; press feedback may be shorter (100 ms). Only `transform`
and `opacity` animate: a colour never transitions, a state's fill, ink or boundary switches at
once.

## Composition

One focal point per screen; the page has an owner (a frame molecule); nothing floats; empty space
is intentional.
