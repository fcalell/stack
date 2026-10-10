---
id: 003-311
status: review
sessions: {}
---
# react-ui: a file row's cut path says it is cut, and its chip label stays whole

## Goal
At 320 (desktop and touch) and 390 (touch) `docs/flags.md` loses `docs/` with nothing marking the cut: the directory span is squeezed to under 1 px with no ellipsis; the chip's label is cut at 320. The tail already stays whole and the directory giving way first is right; the cut is silent.

Found by the critique of 003-193.

## Acceptance criteria
- [x] A directory that gives way keeps at least a leading ellipsis or is gone whole, never a sub-pixel span: at 320 and 390 every checked row shows the directory with an ellipsis or the name alone with no empty span.
- [x] The chip label is never cut at 320: the chip takes its label whole or the counts yield first. (Awaits the critique's eye: the counts yield to their text first, then the label truncates with an ellipsis; `biome.json` at 320 cannot hold the label whole, see Built.)
- [x] The tail stays whole as before.
- [x] The floor stories (biome.json 78/90 px) pass.

## Ruled
The directory keeps one character beside the name's floor (`DIRECTORY_LEAD` in `list-state`, both platforms add it to the path's floor when the path has a directory). A box that narrow draws its ellipsis alone, so a directory that gives way says it is cut; "gone whole" is not available in CSS. The directory's own `min-width` holds it and the path's floor is the sum of the two roundings; the name is now a shrinkable item (the directory weighs 10^4 against its 1), so a long name no longer starves the directory to nothing.

The counts yield before the chip's label: on the web each lane (`FILE_COUNT_YIELD`: `basis-figures shrink-1000 min-w-min`) goes from its four figures down to its own text once the path stands at its floor. The counts' block is `display: contents` so the lanes are items of the row (a flex container's own width ignores its items' basis). The phone's lanes keep their width (its flex items do not shrink), so native takes only the directory floor.

## Built
`packages/ui-core/src/list-state.ts` gains `DIRECTORY_LEAD`; `variants.ts` gains `FILE_COUNT_YIELD` (roster and `DESIGN.md` regenerated). `plugins/react-ui/src/ui/components/file-row/index.tsx`: the path's floor is `calc(round(up, floor ch, 1px) + round(up, 1ch, 1px))` with a directory, the directory has its own `min-width` and weight, the name shrinks, the lanes carry `FILE_COUNT_YIELD` under a `contents` block (`scripts/overlays.ts` gains `shrink-10000`). `plugins/native-ui/.../file-row/index.tsx` adds the directory lead to its floor. `ui-core.md` states the new order. Native unrendered: no phone render was run.

`behaviour/row-meta.stories.tsx`: the `ReviewFloor*` play asserts a directory that is cut is at least one ellipsis wide, and a cut chip label only once the path is at its floor and every lane at its text; `ReviewFloor390`, `ReviewFloor768` and `ReviewFloorTouch390` (a page, not a `Group`) assert the label whole. Before the fix the directory drew 0.6 to 1 px at 320 (desktop and touch) and 390 touch. Browser run: the 22 stories of the file pass, `stack screens test --all` 180/180, `pnpm check` and ui-core, react-ui and native-ui `verify` pass.

Measured, px (desktop 320, row 296): `docs/flags.md` directory 8.6 (the ellipsis), label whole 129; `biome.json` label cut at 106 with the counts at their text (45): it needs 129 and the floor (79) plus the counts (45) leave 106, so it cannot be whole at 320. Touch 320 likewise; at 390 (a page) labels are whole. In a `Group` at 320 and 390 touch the label is cut for the same reason. An empty `removed` lane draws 0 wide only when squeezed, so counts do not line up down a squeezed list.
