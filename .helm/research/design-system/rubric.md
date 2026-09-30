# Rubric: beautiful

The judged half of the standard (`kickoff.md` §6 Beautiful), with line 1 filled from
`reference-sheet.md` (2026-09-29). This is the file the `design-critic` agent loads. Every tell
is a number or a yes/no read off the rendered unit at 1280 and 390, light and dark, pointer parked
off-screen, transitions disabled, every control clicked. The critic's own measurements are the
only machine numbers on a render and never evidence of taste; the numbers below are the floor a screen must clear before the judged
questions in §2 to §8 are asked at all.

## 0. System constants (from the sheet, hold on every screen)

Every size below is the desktop density's. The touch density scales each size by its density
ratio (body 13 → 16, chip 20 → 24, dot 6 → 8, control 32 → 44) and is measured against the
scaled number, never the desktop one.

| Tell | Number |
| --- | --- |
| body type | 12–13 px at desktop density; never below 12 at any density |
| muted second size | 11–12 px, one step below body, never bold |
| heading inside a page | 13–16 px at 500–600; page title 16–28 at 500–600 |
| sizes on one screen | ≤ 6, and ≤ 3 inside any one molecule |
| desktop control height | 24–32 px (inputs 32–38 in forms, 34–40 in auth screens) |
| desktop row height | 26–37 px one-line; 40–72 two-line, measured on the single-line form of each part (a description that wraps adds its lines); 2.8–4.0 rows per 100 px in data views |
| radius | controls and rows 4–6; cards, popovers and sheets 6–8; dialogs 8–12; pills only on chips and status |
| region separation | 1 px hairline or one surface step; shadow only on lifted layers (popover, palette, toast, sheet) |
| hairline lightness | light: `#dfdfdf`–`#ededed` class; dark: 10–15 % lighter than the surface it sits on, `#1f1f1f`–`#34343a` |
| dark surfaces | canvas `#000`–`#191a1f`; each layer +4 to +8 L; at most three steps |
| ink | three levels; no fourth grey |
| selection | grey or tinted fill, or a 1 px outline; accent fill never |
| accent | one filled act per screen at most; otherwise only focus rings, links, selection outlines, the `active` status dot, and a checked control's fill (a checked box, an on switch, a slider's fill), which is a control state, never a selection |
| chip | 16–22 px tall, 10–12 px type, radius 3–4 outlined or pill filled; hue by family, fixed |
| status colour | confined to the icon, dot or chip, never the row's text |
| kbd hint | 18–22 px chip, radius 4, hairline, or plain muted 11 px text |
| skeleton | 12 px bars, radius 4, at the real column widths inside the real row heights |
| pending act | keeps its width and height, swaps the label for a 14–16 px spinner |

## 1. Reference conformance, per pattern

A unit is measured against the row for its pattern; a value outside the range is a finding with
the measured number and the range. Where a row names a dialect, the system's own rule holds and
the references' number is not a finding: labels draw at the body role (13), emphasis is weight
500, a title or heading is the system's role, the focus ring is the system's 2 px ring, and the
§0 accent row's carve-outs (a checked control, the `active` dot) apply inside every pattern.

| Pattern | Range |
| --- | --- |
| sidebar and scope switcher | sidebar 205–245 (or a 45 icon rail); rows 26–36; body 12–13 + one 11–12 muted section label; radius 4–6; hairline edge only; selection grey fill; accent absent |
| settings form | input 38; two-line rows 64–70; label 12–13/500 over 11–12 muted description; page title the system's title role (the references' 15–16 is a dialect); radius 4–8 (cards 8, inputs 4–6); hairline card or surface-step tile; save per card or right-aligned under the group, the system's primary act (dark or accent is a dialect), accent otherwise only on checked controls |
| data table with inline edit | rows 30–37, header 30–34; body 11–13, header 11–12 muted never bold; cell padding 6–8 × 10–12; radius 4 cells and pills, 6 popovers; hairline grid (both axes in editors, horizontal only in lists); hover a surface step; edit state a tinted row or a focused cell ring; accent only on the primary act, checked row boxes and status tints |
| record pane beside a list | list 375, pane 300–395; two-line rows 46–55; property rows 30–34 with label and value at 11–12; one large size (18/600 title); radius 4–6; hairline boundaries; selection grey fill or tinted fill with a left bar |
| command palette | dialog 490–645; input 41–56; rows 29–43 one-line, 50–52 two-line; label 11–12, group eyebrow 9–10 uppercase muted, kbd 10; dialog radius 8–12, rows 4–6; shadow-lifted, hairline only at input and footer; highlight grey fill; accent absent |
| picker and menu | popover 215–300; items 28–34 one-line, 50 two-line; label at body (the references' 11–12 is a dialect; a menu label never differs from a list row's); search as the first 28 px row; radius 6–8, inner chips 4; shadow + hairline (dark: step only); selection a right checkmark or grey/tinted fill; groups by hairline or spacing |
| sheet and confirm | sheet 610–730 wide, inputs 34–38, footer acts 30–32, hairline header and footer split, accent on one act; confirm 365–590 wide, radius 6–8, title the system's heading role (the references' 13–14/600 is a dialect), body 12–13, type-to-confirm input 30–36 (the system's field is a dialect), red only on the destructive act, which is the confirm's one filled act, scrim 40–50 % |
| toast and banner | toast 340–430 wide, 36 (pill) to 100 tall, radius 8 or pill, text 12–13, status colour in the icon only, hairline + shadow; banner 36–44 tall inline to 90 with body, radius 0–6, tinted surface or left rule, act a 24–26 button |
| empty state | title 13–18 (13–14/600 in dense tools), body 12–13 muted, icon 20–64 or illustration 130–190, one primary 28–32 radius 6 carrying the only accent; column 300–360 centred; bare canvas or a radius-8 hairline frame |
| onboarding | title 16–24/500–600, subtitle 12–14 muted; progress 2–4 segments ≈ 4 tall or "Step n of m" at 12; choice cards 190–345 radius 8, selected by a 1 px accent border; inputs 32–36; Continue 28–34, full width when alone; Back and Skip never accented |
| login and OTP | column 300–430; title 16–24/500–600; helper 12–13, address at strong (the references' 600 is a dialect); inputs and buttons 34–40, radius 6 (card 8–12); OTP boxes 42–56 × 40–48, gap 6–10, radius 6, the system's focus ring (the references' 1 px is a dialect); social buttons surface-step or outline; Resend 12 muted text or grey pill |
| page header with acts | top strip 30–36 with 12 breadcrumb; title 16–28/500–600 with a muted description at the meta role (the references' 13 is a dialect); acts 24–32 radius 4–6 right-aligned gap 8, at most one filled; tabs 12–13 with a 2 px underline or 24 pill; hairline regions, cards radius 8 |
| diff and code | line 17–19 at mono 10.5–12; file header 32–40; full-row fills (`#dcfce7`-class add, `#fde2e1`-class remove), 3 px edge bar when split; gutter 40–56 grey; outer card hairline, radius 0–10; accent only on the one commit act |
| activity feed | event rows 20–28 at 11.5–12; comment rows 40–72; body 12–13, actor 500–700; day groups by chip or grey label, never cards; state changes as 18–20 outlined chips with "→"; accent absent |
| board columns | column 260–350, gutter 12–16; header 30–40 at 13–14/500–600 with muted count; card radius 6–8 on hairline, padding 10–12, 40–150 tall; title 13/400–500, meta 11; well one surface step or nothing; accent only on create |
| node canvas | dot grid 14–20 at 1 px on a canvas one step off; nodes radius 6–10 hairline, 44–130 tall (media to 400); eyebrow 10–11 + title 12–13/500; ports 8 hollow; edges 1–1.5 grey, dashed inactive; selection a 1.5 px accent outline; zoom stack 28–36 buttons; accent only on selection and run |
| chips and statuses | 16–22 tall at 10–12, padding 6, radius 3–4 outlined or pill filled; dialects: dot + grey text on hairline, soft fill with hue-darkened text, saturated fill for one exceptional state; a 6 px dot or 3 px row edge may carry status alone; accent never on a chip, and only the `active` status dot wears it |
| filters and toolbars | toolbar 36–48; controls 24–32 at body (the references' 12 is a dialect), outlined, radius 4–6 (or 16 pill dialect); applied filters as a 24–28 token row or a count badge in the select; rule popover 300–500 with 26–32 rows; sort and display right as 12 text or 16 icons; accent only on the focused ring and the one create button |
| members and invitations | rows 40–64 (invites two-line); body 13, meta 12, header 11 uppercase; radius 6–12; hairline rows, at most one bordered card; accent on Invite and the pending chip; destructive act red and last in the overflow |
| version picker | entry 30 one-line to 44–85 history cards; primary 13/500 with 12 muted meta; radius 6–8; selection soft fill or hairline outline; current by chip or check; accent only on Restore |
| keyboard-first navigation | rows 28–42; body 12–13, hint 11; key chips 18–22 radius 4 hairline or muted text; cursor row soft fill, left bar or 1 px outline; footer legend 30 tall; sequences spelled "G then N" |
| dark mode | canvas `#000`–`#191a1f`; layers +4 to +8 L, ≤ 3 steps; hairlines `#1f1f1f`–`#34343a`; ink `#f7f8f8` / `#a1a1a1`–`#d0d6e0` / `#62666d`–`#8a8f98`; one chromatic act or dot per screen; radius 6–8; a calibration, not an inversion |
| density | rows 25–36, 2.8–4.0 per 100 px; controls 26–32; text 12–13 with the leading cell at 500; header 30–34 at 11–12/500; chips 18–20; full hairline grid; radius 4–6; accent out of the body except on checked controls |
| loading and pending | skeleton 12 tall radius 4 at real widths in real row heights; pending act keeps its box, 14–16 spinner, lightened fill; step lists 19 tall with the active step spinning; page waits dim to ~40 % with one pill; long work a chip + timer and a toast on start |

## 2. Type

An obvious scale with at most six sizes on a screen; display ≥ 2.5× body where a display role
appears; measure 45–75 ch where the column is wider than the text's natural measure (a phone
column is exempt: the column sets the measure, body never shrinks to reach it); tracking never below −0.04 em; body never below 12 px at any density;
one sans for UI, mono only for what a machine reads.

## 3. Hierarchy

Three ink levels carry it; no fourth grey; colour never carries hierarchy.

## 4. Structure

Hairlines and surface steps separate regions; fills mark selection and data only; more than one
radius and more than one shadow in the system, each spent by role, never one stamped on every
block.

## 5. Colour

Chrome achromatic or hued on purpose, never a pure mid-grey; accent in one place per screen (acts,
selection, focus, links); status and chip hues fixed per family; dark mode its own calibration.

## 6. Motion

One duration scale, one easing set, one authored moment per screen at most; 150–300 ms for
micro-interactions that move something; press feedback may be shorter (100 ms). Only `transform`
and `opacity` animate: a colour never transitions, a state's fill, ink or boundary switches at
once.

## 7. Composition

One focal point per screen; the page has an owner (a frame molecule); nothing floats; empty space
is intentional.

## 8. Bans (any one fails)

Eyebrow labels (the 9–10 px uppercase group label inside a palette or menu is the one allowed
form); nested cards; gradient text; emoji as icons; placeholder or lorem content; accent rails
(`border-left` > 1 px, except the diff's 3 px edge bar and a selected row's bar where §1 allows
it); glow; mono as costume; and the five AI-default looks: cream + serif + terracotta; near-black
+ acid accent; broadsheet hairlines; the uniform rounded-card kit; tracked all-caps eyebrows with
middle dots and arrows.

Measured on the render, each an outright fail: text under 4.5:1 (large text under 3:1); a control
boundary, focus ring or icon-only control under 3:1 against its ground, in either mode or any
state; a target under 24×24 CSS px (44×44 for a primary act on touch) unless a 24 px circle
centred on it meets no other target or its circle (WCAG 2.5.8: abutting list rows, a wrapping
chip row and a tab row pass when each target is 24 or more); horizontal overflow at 320, 390,
768, 1280 or 1440; a control the keyboard cannot reach or whose focus is not visible; a console
error or warning. The carve-outs, each a WCAG exemption or the approved look: a control whose
label or content names it (a labelled field, an act with a label, a search field with its glyph,
the OTP boxes) is exempt from the 3:1 boundary floor at rest, since the label is the cue; a
disabled part is exempt from the text and boundary floors; an inline link inside a sentence is
exempt from the target floor (a standalone link takes a `target` hit box); a checked box on a
dark selected row keeps its accent fill at 2.1–2.5:1 (rest and hover), the check glyph at 5.3:1 carrying the state.

## Verdict

**ship** when §0 and §1 hold and §2–§8 raise nothing; **rework** when a finding is a number or a
ban with a fix in the contract or the component; **reject** when the unit fails §7 or two or more
bans. Every finding names a file and line, a measurement, or a screenshot, and states the measured
value beside the range. Problems over prescriptions: say what is off and by how much, not how to
draw it.
