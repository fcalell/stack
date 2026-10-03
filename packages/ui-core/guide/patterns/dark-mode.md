# Dark mode

The range dark mode is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

canvas `#000`–`#191a1f`; layers +4 to +8 L, ≤ 3 steps; hairlines `#1f1f1f`–`#34343a`; ink `#f7f8f8` / `#a1a1a1`–`#d0d6e0` / `#62666d`–`#8a8f98`; one chromatic act or dot per screen; radius 6–8; a calibration, not an inversion.

## References

Queries: `dark mode project dashboard with sidebar, cards and a data table` · `dark theme settings page with form fields, section dividers and a save button` · `dark mode issue tracker list view with a dialog open on top showing layered surfaces`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Vercel | [screen](https://mobbin.com/screens/5bb75d66-7572-4f2e-a229-ebc54627343b) | pure-black canvas, cards and popover one step up, hairlines carry every edge | canvas ≈ `#000`, sidebar same; cards + popover ≈ `#0a0a0a`, 1 px hairline ≈ `#262626`; active nav item ≈ `#1a1a1a` fill; ink white / `#a1a1a1` / `#666`; body 13, label 12; card radius 8, menu item 32; accent only on status dots and one green "Alerts only"; card ≈ 375 × 245 |
| Linear | [screen](https://mobbin.com/screens/c968b3b2-82a5-4044-8e4a-0bec5683dec5) | settings groups as filled cards, no hairlines at all; three ink levels | sidebar ≈ 230 on `#191a1f`; content on same canvas; group cards ≈ `#1e2025` radius 8, separated by surface step; row ≈ 56 (title 13/500 + description 12 muted); section heading 13/500 above card; toggles blue only when on; selects hairline 28 h |
| Railway | [screen](https://mobbin.com/screens/348e2be0-dd9b-4e19-8722-c781bb191b34) | near-black canvas, cards and a menu each one step lighter with hairline | canvas ≈ `#0d0d0d`, sidebar same; card ≈ `#131313` + hairline ≈ `#262626`; popover ≈ `#141414` + hairline; ink white / `#8a8a8a`; nav row 28; card radius 6; accent purple on New button and avatar; warning banner yellow-tinted text on tinted fill |
| Vapi | [screen](https://mobbin.com/screens/34079984-55ad-40d8-8438-4aee7c8841e0) | dark table with a filter popover: popover steps up and outlines, badges stay dark chips | canvas ≈ `#0f0f0f`; popover ≈ `#1a1a1a` + hairline ≈ `#2e2e2e`, radius 8; table rows ≈ 88 (two-line), hairline ≈ `#1f1f1f`; chips dark fill 20 h; ink white / `#9a9a9a`; teal accent on Apply and New Monitor only; header 11 muted |
| Frame.io | [screen](https://mobbin.com/screens/6c486ec5-0a08-4528-98c4-48a824ec9db5) | three surfaces stepping lighter rail → sidebar → content, no hairlines between them | rail ≈ 60 `#111`, sidebar ≈ 265 `#161616`, content `#1a1a1a`; selected nav item outlined ≈ `#333` radius 6; search 28 h; row ≈ 40; header row hairline only; ink white / `#8a8a8a`; accent green on avatar only |

DESIGN.md: `vercel`: canvas `#ffffff`, canvas-soft `#fafafa`, canvas-soft-2 `#f5f5f5`, hairline `#ebebeb`, hairline-strong `#a1a1a1`, ink `#171717`, body `#4d4d4d` (light-mode file; the dark render steps canvas → card → popover the same way); radius 4/6/8/12/16; spacing 4/8/12/16/24/32. `linear.app`: canvas `#010102`, surface-1 `#0f1011`, surface-2 `#141516`, surface-3 `#18191a`, surface-4 `#191a1b`; hairline `#23252a`, hairline-strong `#34343a`, hairline-tertiary `#3e3e44`; ink `#f7f8f8`, ink-muted `#d0d6e0`, ink-subtle `#8a8f98`, ink-tertiary `#62666d`; primary `#5e6ad2`; type body-sm 14/400, caption 12/400, button 14/500, eyebrow 13/500, mono 13/400; radius 4/6/8/12/16/24; spacing 4/8/12/16/24/32/48.

The references span: canvas `#000`–`#191a1f`; surfaces step +4 to +8 lightness per layer (canvas → card → popover), never more than three steps; hairlines `#1f1f1f`–`#34343a` (≈ 10–15 % lighter than the surface they sit on), some systems drop them and separate by step alone; ink three levels (`#f7f8f8`, `#a1a1a1`–`#d0d6e0`, `#62666d`–`#8a8f98`); accent one chromatic act or status dot per screen; radius 6–8.

Thin evidence: the `linear.app` and `vercel` `DESIGN.md` files measure the marketing sites (Vercel's in light mode); their dark values are the product screens' estimates.
