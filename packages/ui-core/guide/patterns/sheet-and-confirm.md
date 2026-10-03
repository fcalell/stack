# Sheet and confirm

The range a sheet or a confirm is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

A dialect is the references' number where the system keeps its own; the [judging](../judging.md) page says which hold.

## Range

sheet 610–730 wide, inputs 34–38, footer acts 30–32, hairline header and footer split, accent on one act; confirm 365–590 wide, radius 6–8, title the system's heading role (the references' 13–14/600 is a dialect), body 12–13, type-to-confirm input 30–36 (the system's field is a dialect), red only on the destructive act, which is the confirm's one filled act, scrim 40–50 %.

## References

Queries: `side sheet panel sliding in from the right edge with a form and footer buttons over a dimmed page` · `confirmation dialog asking to delete an item with a destructive red button and cancel button` · `dark mode modal dialog confirming a destructive action with type-to-confirm input field`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Neon | [screen](https://mobbin.com/screens/d51748aa-99fe-43a0-b839-b1688786ac9d) | Right sheet: title bar, hairline-separated body, sticky footer with Cancel outline + one dark primary | sheet ≈ 610 wide, full height; title 16/600 with X right; label 12/500; input ≈ 34; slider section heads 14/600; footer buttons ≈ 30 tall; 3 type sizes; radius 6; header and footer split by hairline; page dimmed ≈ 40 %; accent only on the primary act |
| Vapi | [screen](https://mobbin.com/screens/a2f7aa45-977a-43e8-91d4-e0da7e1acf1c) | Dark sheet with back arrow in title, grouped sections, textarea, footer Cancel ghost + green Save | sheet ≈ 710 wide; title 15/600; label 13/500 + help 12 muted; input ≈ 38, textarea ≈ 130; section box radius 8 with hairline; footer ≈ 60 tall hairline-topped; radius 6; green accent on Save only; 3 type sizes |
| Airwallex | [screen](https://mobbin.com/screens/00a6bb63-fa38-49ea-89f7-17bba3ee1b80) | Sheet with tabs (General / Documents) under title, filled-surface inputs, "Save as draft" link + disabled Create | sheet ≈ 730 wide; title 15/600; tab 13 with 2 px underline; section head 14/600; label 12; input ≈ 38 on a surface step, no border; "+ Add" outline pills ≈ 30; footer acts right; radius 4; 4 type sizes |
| Cloudflare | [screen](https://mobbin.com/screens/aa928ac1-4a1d-4b8c-9ccb-be35211cdca8) | Type-to-confirm delete: name in an inline code chip with copy icon, Cancel outline + red Delete | dialog ≈ 590 wide, radius 8, shadow over 50 % scrim; title 14/600; body 13; input ≈ 36 radius 6; footer buttons ≈ 32; danger red only on Delete; 2 type sizes |
| Resend | [screen](https://mobbin.com/screens/5a77cd07-e815-432f-8b21-43d7ef4a9fbf) | Dark confirm: body + red question line, `DELETE` chip with copy, red-tinted Delete then Cancel ghost, primary on the left | dialog ≈ 490 wide, radius 8, hairline `rgba(255,255,255,0.14)`; title 13/500; body 12; input ≈ 30; buttons ≈ 28; red tint on Delete only; 2 type sizes; denser than light peers |
| Clerk | [screen](https://mobbin.com/screens/71516c8f-ca28-4b68-bca8-01b6ea6e46ec) | Compact confirm with quoted-name instruction, red warning line with icon, full-width paired Cancel / Delete | dialog ≈ 365 wide; title 13/600; body 12; label 12/500; input ≈ 32; warning 11 red; buttons ≈ 32 each half width; radius 6; red fill only on Delete |

DESIGN.md: `resend`: type body-sm 14/400, caption 12/400, button-md 14/500, heading-sm 20/500; radius xs 4 sm 6 md 8 lg 12; border hairline `rgba(255,255,255,0.06)`, hairline-strong `rgba(255,255,255,0.14)`; controls button 36 tall padding 8 16, text-input 40 tall padding 10 14; spacing 2/4/8/12/16/24/32/48.

The references span: sheets 610–730 wide, inputs 34–38, footer acts 30–32, hairline header/footer split, accent on one act; confirms 365–590 wide, radius 6–8, title 13–14/600, body 12–13, type-to-confirm input 30–36, red reserved for the destructive act, scrim 40–50 %.
