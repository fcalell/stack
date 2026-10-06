---
id: 003-93
status: backlog
sessions: {}
---
# react-ui: a banner's act reads as a grey-outlined box on the tint

## Goal
`Banner` draws its act as `Button act="secondary" fit="bar"`, a hairline button. On the danger and warn tints the hairline reads as a grey outline around a white box, out of the tint's family, and it is the heaviest thing on the strip. Stead's shell banner (`routes/__root.tsx`: Retry, Open, Open Usage) shows it on every screen it appears.

## Approach
The app passes only `act`; the button's variant is the Banner's. Reference banners (Linear, Vercel, GitHub) draw the act as a tinted or text button in the banner's kind, without a neutral border. Screens: Stead's sign-off set, `banner-urgent-*`.

## Acceptance criteria
- [ ] A banner's act takes the kind's family, with no neutral outline on a tint, in light and dark.

## Open questions
- [ ] A banner act variant, or a tinted secondary: the stack session decides.
