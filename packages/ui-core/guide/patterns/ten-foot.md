# Ten-foot

The range a screen read from across a room (a television, a wall or kiosk display) is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

on a 960-wide canvas (twice each number on a 1920 CSS px screen): body 15–16, supplemental text never under 12; controls at least 32; essential content 48 in from the sides and 27 from top and bottom; at most a phone's information; a glanceable figure 5–9× its label, one per region; focus unmistakable (a 1.025–1.1 scale or an outline outside the element), never a hover-only state; dark (a room Place keeps the app's mode, so the app runs dark), no meaning carried by a subtle hue difference.

## References

Queries: screens `full-screen wall dashboard or status board with very large numbers and few labels, readable from across a room` · `landscape full-screen glanceable display with a huge clock or timer and a small label, like a nightstand or standby mode` (iOS) · `dark full-screen TV or presentation mode showing a few big KPI numbers with labels, no sidebar, for a display on an office wall`

Mobbin catalogues phone and web screens and holds no television or wall display, so this shortlist is thinner than the rest. The platforms' published ten-foot guidance stands in for the sizes, and glanceable phone screens stand in for the figure-to-label ratio.

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Microsoft (Xbox and TV) | [guide](https://learn.microsoft.com/en-us/windows/apps/design/devices/designing-for-tv) | The ten-foot experience's published sizes: a 960 × 540 canvas scaled to the 1080p screen | canvas 960 × 540 epx at 200 % (1280 × 720 at 150 % for HTML apps); main text ≥ 15 epx, supplemental ≥ 12; interactive controls ≥ 32 epx high; essential UI 48 epx from the sides and 27 from top and bottom; edge to edge in at most six moves; information "comparable to … a mobile phone, rather than … a desktop"; dark by default; no tooltips |
| Android TV | [layouts](https://developer.android.com/design/ui/tv/guides/styles/layouts) | The same canvas from the other platform, with its grid | canvas 960 × 540 dp at mdpi, assets at 1080p; overscan margin 48 dp at the sides, 27 (rounded to 24) top and bottom; 12 columns of 52 dp, gutter 20 |
| Android TV | [focus system](https://developer.android.com/design/ui/tv/guides/styles/focus-system) | How focus reads from the sofa: the focused element grows or is outlined | scale 1.025, 1.05 or 1.1 by element size; glow 2–32 dp; outline drawn outside the element at an inset; states default, focused, pressed |
| FotMob | [screen](https://mobbin.com/screens/fbef6a0e-13dc-42d0-b640-a4577310cccc) | Lock screen with a live score: the system's glance hierarchy | time ≈ 96/500 over date ≈ 17/600 (≈ 5.6×); live activity score ≈ 24, team names ≈ 12, match clock ≈ 12 in green; light glass card radius ≈ 24 |
| Oura | [screen](https://mobbin.com/screens/d4f18703-69ba-4cce-bdb3-48c0c037a326) | Indoor run: one figure fills the screen, read at arm's length mid-stride | figure ≈ 100/300 tabular under a ≈ 11 tracked uppercase label (≈ 9×); title ≈ 15 at the top; dark ground, nothing else on screen |
| AllTrails | [screen](https://mobbin.com/screens/6948e428-1178-443a-b8b8-7661f6ef9e83) | Three stats stacked for a glance while walking | label ≈ 13 muted over figure ≈ 62/400 (≈ 5×); unit ≈ 16 on the figure's baseline; left-aligned, no cards or rules, ≈ 20 between stats |
| Gorgias | [screen](https://mobbin.com/screens/d201baf7-979c-4b6c-a849-fc35269ab6bb) | A live desktop board, the set a ten-foot screen must not inherit | stat strip labels ≈ 11/600 uppercase, figures ≈ 24 at 1440; chart legend ≈ 13; sidebar ≈ 240 of 12 px rows; at three metres every word but the figures falls under the 12-epx floor |

DESIGN.md: none of the cited products is in the corpus. `apple` covers apple.com, not the lock screen: hero-display 56, display-lg 40, display-md 34, body 17, caption 14.

The references span: body 15–16 and supplemental ≥ 12 on the 960 canvas (Microsoft; 30–32 and 24 at 1920); controls ≥ 32 (64 at 1920); safe inset 48 sides / 27 top and bottom; one 960 × 540 canvas on both platforms, so a screen's sizes scale with its width; a glance figure 5.6× (FotMob), 5× (AllTrails) to 9× (Oura) its label; focus by scale 1.025–1.1 or an outside outline; information held to a phone's, which Gorgias's desktop board exceeds.
