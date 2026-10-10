---
id: 003-186
status: done
sessions: {}
---
# react-ui: the Slider's hit area meets the target floor

## Goal
The Slider thumb draws 10 px (12 outer) at desktop and 18 px (20 outer) at touch (`r2-components/report.md`, "Slider", pre-existing); measure its hit area against the 24 px target floor (axe `target-size`, the pointer's actual hit box).

## Approach
Measure the thumb, its track control (`min-h-target`, the element Base UI takes the press on) and axe's `target-size` on `atom-slider--rest` at 1280 and 390 touch.

## Acceptance criteria
- [x] The pointer's hit box is the track control, 240 x 24 at desktop and 240 x 44 at touch, centred on the thumb: `elementFromPoint` returns the control up to 10 px (20 px touch) from the thumb's centre, the thumb's wash at its own radius.
- [x] axe `target-size` on the roster story's 18 sliders: 0 violations at both densities.

## Ruled
Not a defect, no code. The drawn thumb is a mark on a full-width target; the target floor applies to the control, which meets it. The stories run's axe pass also checks `target-size` on every slider story.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. No critique unit this round; the behaviour and screens suites hold it.
