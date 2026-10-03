# Keyboard-first navigation

The range keyboard navigation is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

rows 28–42; body 12–13; cursor row soft fill, left bar or 1 px outline; every control reachable by Tab and arrows with the ring; no shortcut hints or sequences by default (a key chip 18–22 radius 4 hairline is the command palette's, not the sidebar's).

## References

Queries: `command palette with keyboard shortcut hints next to each action, dark mode` · `keyboard shortcuts cheat sheet modal listing key combinations for navigating the app` · `issue list with a keyboard-selected row and shortcut key badges in the menu and toolbar`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Attio | [screen](https://mobbin.com/screens/fa567c5a-616d-4991-88fc-e2a047b5fcfd) | shortcut reference as a searchable side panel over the live table; sidebar shows ⌘K and / hints inline | panel ≈ 355; search 30 h; section labels 11 muted; row ≈ 28 (3.5/100), 12/400; keys as bordered chips 18 h, sequences written "G then N"; monochrome, no accent; table behind at row ≈ 34 |
| Supabase | [screen](https://mobbin.com/screens/9b4725f5-e038-4fc7-98ad-64a59f74b4d7) | palette groups Shortcuts / Queries / Actions, hints as plain two-key chords | palette ≈ 545 wide, radius 8, shadow, no border; input 40 h; group label 11 uppercase tracked; row ≈ 42 (2.4/100), 13/400; hints "O N" 11 mono right-aligned; hovered row gray fill |
| Fey | [screen](https://mobbin.com/screens/ff52ac90-4d18-4765-98da-df1e362a5ee1) | dark onboarding that teaches single-key acts; inline `space` kbd in the sentence | list row ≈ 40; key badges ≈ 22 square, hairline, 11; focused row blue outline 1 px on `#1a1a1a`; palette `#141414` + hairline; heading 22/500 warm gradient, body 12 muted |
| Juicebox | [screen](https://mobbin.com/screens/2af813bf-0129-45d1-81ed-069edee76e16) | keyboard-driven palette with a footer legend and a left-bar cursor row | palette ≈ 610; row ≈ 42, 13; selected row 2 px purple left bar + light fill; footer 30 h with kbd chips "↵ to select · ↑↓ to navigate · Tab to jump sections · ⌘K to toggle" 11 muted; radius 8 |
| Height | [screen](https://mobbin.com/screens/7816b00a-ce5f-4c54-99cc-60fd3d5c5ca2) | editable shortcut list: every command a row, chord as right-aligned gray text | modal ≈ 1160; nav column ≈ 260; search 28 h + "Show only custom" toggle; row ≈ 32 (3.1/100), icon 16 + 13/400; chord 12 muted "Cmd+Shift+1"; hairline rows; disclosure caret on grouped commands |

DESIGN.md: `supabase`: type body-md 16/400, button-md 14/500, caption 13/400, micro 12/400, code 14/400; radius 4/6/8/12/16; border hairline `#dfdfdf`, hairline-strong `#c7c7c7`, hairline-cool `#ededed`; canvas-night `#1c1c1c`, canvas-night-soft `#202020`; spacing 2/4/8/12/16/24/32.

The references span: rows 28–42; body 12–13, hint 11 (mono or chip); key chips 18–22 h square-ish radius 4 with hairline, or plain muted text when the list is long; cursor row by soft fill, left accent bar or 1 px outline, never accent fill; footer legend 30 h repeats the navigation keys; sequences spelled "G then N" or "O N".
