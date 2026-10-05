---
id: 003-54
status: backlog
sessions: {}
---
# ui-core: a meter marks a threshold on its track

## Goal
A runtime window's meter shows the reserve on its own track, the point past which jobs and watches pause. System, Usage, each window's `Group`. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`Meter` draws one fill against its max and no mark. `Slider` sets the reserve on its own track under the meter, so the used fill and the reserve read on two scales. `BarChart` draws bars over time, not one measure against a limit.

Reference: OpenAI Platform's budget meter with tick marks ([screen](https://mobbin.com/screens/b781c7ac-618d-4946-9ef2-808f6f933d71)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Shape
`Meter.mark?: { value: number; label: string }`: a tick across the track at `value / max` (`w-track` in `ink-body`, standing proud of the track by `inside`, outside the clipped track), the fill turning `warn` once the value passes it, its label read aloud only (slot word `meterMark`). The `levelOf` rule moves into ui-core beside `METER_NEAR`. 004-09's `List` meter map gains `mark`.
