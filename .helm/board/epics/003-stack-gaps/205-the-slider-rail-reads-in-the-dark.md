---
id: 003-205
status: backlog
sessions: {}
---
# react-ui: the Slider's rail reads against the dark surface

## Goal
Stead's Usage page puts a `Slider` ("Reserve", 0 to 50 percent) under each window's Used card (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/usage.tsx`, the `Slider` at lines 246-257; design/07-interface.md "Usage"). In dark at 1440 the rail past the thumb draws as a hairline of about 1 px, near-invisible at 0%, and only the thumb's border (4.08:1) tells the viewer there is a slider. Evidence: Stead System critique (`critique/u8/report.md`, `shots2/dk-usage.png`), stack at `74a0e3d`, HEAD checked.

## Approach
The slider's unfilled rail is `SLIDER_REST = "h-track rounded-full bg-edge"` (ui-core/src/variants.ts), and `track` is 2 px at the desktop density (4 px at touch; ui-core/src/tokens.ts). `edge` is the hairline token (dark `neutral(0.298, 0.008)`), made to sit beside a surface, so a 2 px bar in it is a hairline: the same ink and weight as the Group's own border beside it, not a track. The app passes only `value`, `min`, `max`, `step` and `onChange` and cannot restyle the rail. Not 003-186 (its hit area, ruled not a defect) and not 003-176 (the thumb's play).

## Acceptance criteria
- [ ] The unfilled rail reads as a track in dark and in light at both densities, its contrast against the surface measured by the critique, with the filled part and the thumb unchanged.
- [ ] A disabled Slider keeps its disabled look.
- [ ] The Slider showcase measures the rail's height and contrast at value 0 in dark.

## Open questions
- [ ] Its shape (a stronger rail ink, a taller desktop rail, or both): the stack session decides.
