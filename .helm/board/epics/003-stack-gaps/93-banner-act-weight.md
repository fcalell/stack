---
id: 003-93
status: review
sessions: {}
---
# react-ui: a banner's act reads as a grey-outlined box on the tint

## Goal
`Banner` draws its act as `Button act="secondary" fit="bar"`, a hairline button. On the danger and warn tints the hairline reads as a grey outline around a white box, out of the tint's family, and it is the heaviest thing on the strip. Stead's shell banner (`routes/__root.tsx`: Retry, Open, Open Usage) shows it on every screen it appears.

At 390 and 320 the act stands under the sentence as an outlined 73 x 44 button, not at the line's end, and the banner is 92 px (urgent) and 116 px (two lines) tall; at 1280 it is 40 px tall. Evidence: Now critique unit u1, shot `c-banner-390-light` (Stead scratchpad `critique/u1/shots/`).

## Approach
The app passes only `act`; the button's variant is the Banner's. Reference banners (Linear, Vercel, GitHub) draw the act as a tinted or text button in the banner's kind, without a neutral border. Screens: Stead's sign-off set, `banner-urgent-*`.

## Acceptance criteria
- [x] A banner's act takes the kind's family, with no neutral outline on a tint, in light and dark.

## Open questions
- [ ] A banner act variant, or a tinted secondary: the stack session decides.

## Built
No variant: the Banner draws its act as the existing `quiet` Button at the bar fit, in the kind's ink (`bannerGlyph`'s class on the label and the box, so a spinner or glyph follows) at the label's weight 500, with no hairline or fill. The Banner hands the ink through `ActInk` (`lib/act-ink.ts`, both platforms); a quiet Button reads it, and a blocked or pending act keeps its own look. The 44 px touch target is the bar fit's `control-compact`. The roster's Banner draws `BUTTON.act.quiet` and owns no `edge`.
Evidence: `ui-core verify`, `plugin-react-ui verify`, `plugin-native-ui verify` and `pnpm check` pass; `shared/Banner` Rest and Disabled pass in the browser run.
Owner render: `shared/Banner` Rest (note, warn, danger) and Disabled, light and dark.

## Critique
Rework: the info Banner act's "Read more" label falls under the 4.5:1 text floor on hover (4.48:1) and press (4.26:1) in light; rest is 4.96:1. The act's look (no outline, the kind's ink) holds.

## Rework
The info banner's act label fell to 4.48:1 on hover and 4.26:1 on press in light (rest 4.96), under the 4.5 text floor (`critique/acts`). `accent-ink` now holds 4.5:1 on `accent-soft` under `wash-press`, the darkest ground a quiet act takes there, as the light `danger` holds under it on a group: its light lightness is declared 0.505 where it was 0.52 (`packages/ui-core/src/tokens.ts`; `verify` c11 reads the new default; `.helm/knowledge/architecture/ui-core.md` names the hold; `DESIGN.md` is regenerated). Evidence: `ui-core verify` 34/34 (220 pairs at their floor), `Shared/Banner` stories in the browser run.
