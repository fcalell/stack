---
id: 003-311
status: done
sessions: {}
---
# react-ui: a file row's cut path says it is cut, and its chip label stays whole

## Goal
At 320 (desktop and touch) and 390 (touch) `docs/flags.md` loses `docs/` with nothing marking the cut: the directory span is squeezed to under 1 px with no ellipsis; the chip's label is cut at 320. The tail already stays whole and the directory giving way first is right; the cut is silent.

Found by the critique of 003-193.

## Acceptance criteria
- [x] A directory that gives way keeps at least a leading ellipsis or is gone whole, never a sub-pixel span: at 320 and 390 every checked row shows the directory with an ellipsis or the name alone with no empty span.
- [x] The chip label yields last: the counts go down to their text first, then the path to its floor (the directory kept as an ellipsis), and only then does the chip's label truncate with an ellipsis; the row never overflows, the tail stays whole, and at 390 desktop and at 768 the label is whole. At 320 (desktop, touch, in a Group) `biome.json` cannot hold the 129 px label whole beside its floor (79) and the counts' text (45), so the label truncates there by design; at touch 390 the long `docs/billing/…` row's label is 5 px short (137 needed, 132 left beside the two-character directory lead), cut by the same order.
- [x] The tail stays whole as before.
- [x] The floor stories (biome.json 78/90 px) pass.

## Ruled
The directory keeps two characters (rework; first built as one) beside the name's floor (`DIRECTORY_LEAD` in `list-state`, both platforms add it to the path's floor when the path has a directory). The first character and the ellipsis after it ("d…"), so a directory that gives way says it is cut; "gone whole" is not available in CSS. The directory's own `min-width` holds it and the path's floor is the sum of the two roundings; the name is now a shrinkable item (the directory weighs 10^4 against its 1), so a long name no longer starves the directory to nothing.

The counts yield before the chip's label: on the web each lane (`FILE_COUNT_YIELD`: `basis-figures shrink-1000 min-w-min`) goes from its four figures down to its own text once the path stands at its floor. The counts' block is `display: contents` so the lanes are items of the row (a flex container's own width ignores its items' basis). The phone's lanes keep their width (its flex items do not shrink), so native takes only the directory floor.

## Built
`packages/ui-core/src/list-state.ts` gains `DIRECTORY_LEAD`; `variants.ts` gains `FILE_COUNT_YIELD` (roster and `DESIGN.md` regenerated). `plugins/react-ui/src/ui/components/file-row/index.tsx`: the path's floor is `calc(round(up, floor ch, 1px) + round(up, 1ch, 1px))` with a directory, the directory has its own `min-width` and weight, the name shrinks, the lanes carry `FILE_COUNT_YIELD` under a `contents` block (`scripts/overlays.ts` gains `shrink-10000`). `plugins/native-ui/.../file-row/index.tsx` adds the directory lead to its floor. `ui-core.md` states the new order. Native unrendered: no phone render was run.

`behaviour/row-meta.stories.tsx`: the `ReviewFloor*` play asserts a directory that is cut is at least one ellipsis wide, and a cut chip label only once the path is at its floor and every lane at its text; `ReviewFloor390`, `ReviewFloor768` and `ReviewFloorTouch390` (a page, not a `Group`) assert the label whole. Before the fix the directory drew 0.6 to 1 px at 320 (desktop and touch) and 390 touch. Browser run: the 22 stories of the file pass, `stack screens test --all` 180/180, `pnpm check` and ui-core, react-ui and native-ui `verify` pass.

Measured, px (desktop 320, row 296): `docs/flags.md` directory 8.6 (the ellipsis), label whole 129; `biome.json` label cut at 106 with the counts at their text (45): it needs 129 and the floor (79) plus the counts (45) leave 106, so it cannot be whole at 320. Touch 320 likewise; at 390 (a page) labels are whole. In a `Group` at 320 and 390 touch the label is cut for the same reason. An empty `removed` lane draws 0 wide only when squeezed, so counts do not line up down a squeezed list.

## Owner ruling
The chip label yields last, as `guide/rules.md` already orders the file row (the path to its floor, then the label truncates; the row never overflows): a chip label is a word slot whose narrowest-width failure is the ellipsis (precedent 003-118, 003-193). Hiding the counts drops data, a second chip form is new surface, a wrapped row breaks the one-line row height; the box is reworded to the rule and met as built.

## Built (rework)
Review finding: at 320 the one-character directory box drew the first letter and a clipped sliver, not an ellipsis (`docs/flags.md` read "dflags.md" on desktop, "d.flags.md" on touch); the engine keeps a cut box's first character before the ellipsis, so a one-character box can never draw one. `DIRECTORY_LEAD` is now 2 in `packages/ui-core/src/list-state.ts`: the first character and the ellipsis after it ("d…"). Both platforms already add it to the path's floor, so no other code changed (the web comment in `file-row/index.tsx` and `ui-core.md` say two). The floor stories (biome.json 79/91 px) and the counts, then path, then label yield order hold. Native unrendered: the phone's floor takes the same constant.

`behaviour/row-meta.stories.tsx`: the `ReviewFloor*` play now measures a probe in the directory's own font holding its first character and an ellipsis, and asserts a cut directory's box is at least that wide and overflows its text (a sliver box fails). Browser run: row-meta and section-more, 26 tests, pass.

Cost, flagged: on touch the lead is 22 px, which leaves the long billing row's label (137 px) 5 px short of whole at 390 (132 px), so `ReviewFloorTouch390` allows the cut under the same rule as at 320 (only once the path stands at its floor and the counts at their text). Desktop 390 and 768 and touch 768 stay whole. The owner may rule whether that row's label must stay whole at touch 390 (it would need a lead under two characters, which CSS cannot draw).

## Ruled (rework)
The directory's visible cut mark wins over a whole label at touch 390: a cut directory needs its first character and the ellipsis (CSS keeps one grapheme before the ellipsis), and the label truncating last is the order the owner ruled; the box is reworded to the widths where the label is whole.

## Built (rework 2)
Review finding: at touch 390 the `biome.json` and `docs/flags.md` labels drew "what the check rea…" with the box 0.05 px short of its text (136.594 against 136.641), and the flags row at 320 desktop likewise (116.98 against 117.11). The cause is the shrink weights, not a rounding: the counts' lanes shrank at 10^3 against the chip's 1, so while a lane gave up its px the chip gave up a thousandth of that (0.13 px at 320, 0.05 px at 390) before the lanes stood at their text, and a label that fits to a sub-pixel was cut. `FILE_COUNT_YIELD` in `packages/ui-core/src/variants.ts` now weighs 10^5 (still under the path's 10^7), which leaves the chip under a 64th of a pixel, so it receives its text whole; the ruled order and the cut on the long billing row are unchanged. `ui-core.md` and the web comment say 10^5. Native unrendered: the phone's lanes do not shrink.

`behaviour/row-meta.stories.tsx`: `labelWhole` measures the label's rendered text (a `Range`) against its box's fractional width with no tolerance, and `scrollWidth` besides; the `ReviewFloor*` plays take the rows that may cut as a rule: `biome.json` and the billing row at 320, the billing row alone at touch 390, none at desktop 390 and 768, and `docs/flags.md` whole wherever the label has room (320 desktop included). Before the fix `ReviewFloor320` and `ReviewFloorTouch390` failed on these labels. Browser run: row-meta and section-more, 26 tests, pass.

## Re-review
Final re-critique (desktop 320, 390, 768; touch 320, 390; light and dark): pass. Every label that fits is drawn whole (box equals text width to 0 px: biome.json and docs/flags.md 136.641 at touch 390, flags 117.109 at 320); the cuts are the ruled ones (billing at touch 390, 4.67 px; labels at 320); a cut directory reads "d…" with no sliver; no row overflows. Native unrendered (it takes the same `DIRECTORY_LEAD`).
