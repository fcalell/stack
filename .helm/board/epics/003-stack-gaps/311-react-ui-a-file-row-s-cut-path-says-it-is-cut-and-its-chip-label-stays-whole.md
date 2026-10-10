---
id: 003-311
status: backlog
sessions: {}
---
# react-ui: a file row's cut path says it is cut, and its chip label stays whole

## Goal
At 320 (desktop and touch) and 390 (touch) `docs/flags.md` loses `docs/` with nothing marking the cut: the directory span is squeezed to under 1 px with no ellipsis; the chip's label is cut at 320. The tail already stays whole and the directory giving way first is right; the cut is silent.

Found by the critique of 003-193.

## Acceptance criteria
- [ ] A directory that gives way keeps at least a leading ellipsis or is gone whole, never a sub-pixel span: at 320 and 390 every checked row shows the directory with an ellipsis or the name alone with no empty span.
- [ ] The chip label is never cut at 320: the chip takes its label whole or the counts yield first.
- [ ] The tail stays whole as before.
- [ ] The floor stories (biome.json 78/90 px) pass.
