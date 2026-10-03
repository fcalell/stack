# Toast and banner

The range a toast or a banner is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

toast 340–430 wide, 36 (pill) to 100 tall, radius 8 or pill, text 12–13, status colour in the icon only, hairline + shadow; banner 32–44 tall inline (a one-line notice at a row's height, 40 with its act) to 90 with body, radius 0–6, tinted surface or left rule, act a 24–28 button (the Button's bar fit).

## References

Queries: `toast notification in the bottom corner confirming an action was saved with an undo link` · `inline banner across the top of a dashboard warning about billing or a verification needed with a dismiss button` · `dark mode dashboard with a small success toast popup at the bottom right after copying or saving`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Coda | [screen](https://mobbin.com/screens/580abcac-fdb0-4c72-b6ea-b529d42bfa1e) | Bottom-centre toast: message, Undo link, X; light card on light page | ≈ 430 wide × 70 tall; body 13/400; Undo 13 link-blue; radius 8; hairline + soft shadow; 1 type size |
| Skiff | [screen](https://mobbin.com/screens/bf104b69-c42d-4fb9-a746-d51ca884f4a6) | Bottom-right inverted (dark on light) toast with title, body, Undo as small button | ≈ 355 wide × 100 tall; title 13/500; body 12 muted; Undo button ≈ 26 tall outlined; radius 8; X top-right; 2 type sizes |
| Laravel Cloud | [screen](https://mobbin.com/screens/5a0b71b3-f06f-4b14-af43-b862c1550a8f) | Pill success toast bottom-centre, green check, bold subject in-line | ≈ 370 wide × 36 tall; text 13 with 600 on the name; radius pill; dark fill on light page; icon-only status colour |
| Lovable | [flow](https://mobbin.com/flows/d092c4b4-3e75-4475-9a48-dc83a386a59c) | Bottom-right stacked toast (title + body) with green check; same chrome on light and dark canvases | ≈ 340 wide × 60 tall; title 12/500; body 12 muted; radius 8; hairline + shadow; green only in the icon |
| Framer | [screen](https://mobbin.com/screens/329098e1-751d-4322-90f0-569573cbdf85) | Bottom-centre chip notice with icon and a Dismiss button | ≈ 380 wide × 36 tall; text 13; Dismiss 12/500 in a surface-step button; radius 8; hairline + shadow |
| Graphite | [screen](https://mobbin.com/screens/e058beb8-a8a7-4cb6-886a-654fc33ba62e) | Inline warning banner in page flow: 3 px amber left rule, icon, text, Upgrade button, X | ≈ 36 tall, full content width; text 13; button ≈ 24 tall; radius 6; amber tint only on the rule and icon |
| Better Stack | [screen](https://mobbin.com/screens/4c01167d-1db7-4d92-822a-01e107afba61) | Inline success banner (green-tinted surface, dot icon, bold title + two body lines) on a dark page | ≈ 90 tall; title 13/600; body 13; radius 6; tint + hairline, no shadow |
| ManyChat | [screen](https://mobbin.com/screens/03b30f47-6ee9-449c-80cc-58456bf3d871) | Full-width top strip, dark on light, icon + sentence + link + X | ≈ 44 tall; text 12; link underlined; square corners; app shifts down |

DESIGN.md: `framer`: type body 15/400, body-sm 14/500, caption 13/500, micro 12/400, button 14/500; radius 4/6/10/15/20, pill 100; border hairline `#262626`, hairline-soft `#1a1a1a`; spacing 4/8/12/15/20/30/40. `lovable`: type body 16/400, button 16/400, button-sm 14/400, caption 14/400; radius 6 buttons, 12 cards, pill only for icon/action pills; border `1px #eceae4`, interactive `rgba(28,28,28,0.4)`; focus shadow `rgba(0,0,0,0.1) 0 4px 12px`. `vercel` (reference, not shortlisted): ex-toast radius md 8, padding 12 16, body-sm 14/400.

The references span: toasts 340–430 wide, 36 (pill) to 100 (title + body + act) tall, radius 8 or pill, text 12–13, status colour confined to icon, hairline + shadow separation; banners 36–44 tall (inline) to 90 (message + body), radius 0–6, tinted surface or left rule, act as a small 24–26 button.

Thin evidence: one full-width top banner at calibre (ManyChat); the rest are inline banners (Graphite, Better Stack) and bottom chips (Framer).
