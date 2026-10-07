# Rubric: beautiful

The standard a stack component and a consumer screen are judged by, in a
[design critique](./design-critique.md). Every tell is a number or a yes/no read off the rendered
unit at 1280 and 390 (a phone screen at 390 and 320 dp), light and dark, pointer parked
off-screen, transitions disabled, every control clicked. The critic's own measurements are the
only machine numbers on a render and never evidence of taste. The numbers, the constants below and each pattern's range (its page
under `patterns/`), are the floor a unit must clear before the judged questions
([judging](./judging.md)) and the bans below are asked at all.

## System constants (hold on every screen)

Every size below is the desktop density's. The touch density scales each size by its density
ratio (body 13 → 16, chip 20 → 24, dot 6 → 8, control 32 → 44) and is measured against the
scaled number, never the desktop one.

| Tell | Number |
| --- | --- |
| body type | 12–13 px at desktop density; never below 12 at any density |
| muted second size | 11–12 px, one step below body, never bold |
| heading inside a page | 13–16 px at 500–600; page title 16–28 at 500–600 |
| sizes on one screen | ≤ 6, and ≤ 3 inside any one molecule, an atom's own sizes not counted against its molecule |
| desktop control height | 24–32 px (inputs 32–38 in forms, 34–40 in auth screens) |
| desktop row height | 26–37 px one-line; 40–72 two-line, measured on the single-line form of each part (a description that wraps adds its lines); 2.8–4.0 rows per 100 px in data views |
| radius | controls and rows 4–6; cards, popovers and sheets 6–8; dialogs 8–12; pills only on chips and status |
| region separation | 1 px hairline or one surface step; shadow only on lifted layers (popover, palette, toast, sheet) |
| hairline lightness | light: `#dfdfdf`–`#ededed` class; dark: 10–15 % lighter than the surface it sits on, `#1f1f1f`–`#34343a` |
| dark surfaces | canvas `#000`–`#191a1f`; each layer +4 to +8 L; at most three steps |
| ink | three levels; no fourth grey |
| selection | grey or tinted fill, or a 1 px outline; accent fill never; a tab bar's selected tab is ink alone, its label body ink at 500 and its glyph body ink |
| accent | one filled act per screen at most; otherwise only focus rings, links, selection outlines, the `active` status dot and the `running` status spinner, and a checked control's fill (a checked box, an on switch, a slider's fill), which is a control state, never a selection |
| chip | 16–22 px tall, 10–12 px type, radius 3–4 outlined or pill filled; hue by family, fixed |
| status colour | confined to the icon, dot or chip, never the row's text |
| kbd hint | 18–22 px chip, radius 4, hairline, or plain muted 11 px text |
| skeleton | 12 px bars, radius 4, at the real column widths inside the real row heights; a row's text starts where the loaded row's does, so within one list every row leads with one kind of mark (avatar, glyph or status dot) or none does; a collection of unknown length waits with a fixed number of rows; the list's height may change only by the difference in row count: each waiting row matches its loaded row's height and text start, measured row by row, and any per-row difference is a finding, except that a loaded row whose text wraps grows by its wrapped lines, its waiting row matching its one-line form |
| pending act | keeps its width and height, swaps the label for a 14–16 px spinner |

## Floors

Measured on the render, each an outright fail: text under 4.5:1 (large text under 3:1); a control
boundary, focus ring or icon-only control under 3:1 against its ground, in either mode or any
state; a target under 24×24 CSS px (44×44 for a primary act on touch) unless a 24 px circle
centred on it meets no other target or its circle (WCAG 2.5.8: abutting list rows, a wrapping
chip row and a tab row pass when each target is 24 or more); horizontal overflow at 320, 390,
768, 1280 or 1440; a control the keyboard cannot reach or whose focus is not visible; a console
error or warning. The carve-outs, each a WCAG exemption or the system's own look: a control whose
label or content names it (a labelled field, an act with a label, a search field with its glyph,
the OTP boxes) is exempt from the 3:1 boundary floor at rest, since the label is the cue; a
disabled part, a node off a run's path and a dimmed edge (off a run's path, or into or out of a
node switched off) are exempt from the text and boundary floors; an inline link inside a sentence is
exempt from the target floor (a standalone link takes a `target` hit box); a checked box on a
dark selected row keeps its accent fill at 2.1–2.5:1 (rest and hover), the check glyph at 5.3:1 carrying the state.

### Accessibility

The bar is WCAG 2.2 AA by construction, at two levels, each a floor. Semantics: an accessible name, role and state on every control, and the contrast, target, keyboard-reach, visible-focus and reduced-motion floors above. Widget behaviour: an overlay takes focus when it opens and returns it to its trigger when it closes, Escape closes it, and the page behind a modal is hidden from assistive tech; a composite (menu, list box, grid, radio group, tree) moves by arrow keys and typeahead; a toast or a changed status is announced. A role promises its behaviour, so a role without that behaviour fails. Both levels are tested by `pnpm stories:test` before a UI change lands. Semantics: axe on every component and state story (light and dark side by side, desktop density) with every rule but the page-level ones, which a component's frame cannot answer, and on every page story (the `/layout` places, a pushed Screen and an open record, one mode per story) with every rule, the page-level ones included. Widget behaviour: a play test per interactive component drives the real component by keyboard and asserts the floor above (focus in, focus back, Escape, the page behind hidden, arrow keys and typeahead, the announcement). A verified screen-reader matrix and a conformance report are out of scope until a product needs them.

## Bans (any one fails)

Eyebrow labels (the 9–10 px uppercase group label inside a palette or menu is the one allowed
form); nested cards; gradient text; emoji as icons; placeholder or lorem content; accent rails
(`border-left` > 1 px, except the diff's 3 px edge bar and a selected row's bar where its pattern
page allows it); glow; mono as costume; and the five AI-default looks: cream + serif + terracotta; near-black
+ acid accent; broadsheet hairlines; the uniform rounded-card kit; tracked all-caps eyebrows with
middle dots and arrows.

## Verdict

**ship** when the constants, the floors and the pattern ranges hold and neither the bans nor
the judged questions raise anything; **rework** when a finding is a number or a
ban with a fix in the contract or the component; **reject** when the unit fails composition or two or more
bans. Every finding names a file and line, a measurement, or a screenshot, and states the measured
value beside the range. Problems over prescriptions: say what is off and by how much, not how to
draw it.
