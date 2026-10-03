# Members and invitations

The range members or invitations is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

rows 40–64 (invites two-line); body 13, meta 12, header 11 uppercase; radius 6–12; hairline rows, at most one bordered card; accent on Invite and the pending chip; destructive act red and last in the overflow.

## References

Queries: `workspace members settings page with a table of members, roles and pending invitations` · `invite team members dialog with email input and role dropdown` · `team member list with avatars, role selector per row and an invite button, dark mode`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Attio | [screen](https://mobbin.com/screens/4f090dd4-deb6-4eae-b0ed-6a9c653594c0) | one table holds members and pending invites; the row's overflow menu carries Resend / Copy link / Revoke | sidebar ≈ 260; content ≈ 720 max; search ≈ 32 h + Filter + primary Invite; row ≈ 40 (2.5 rows/100); avatar 20; body 13, uppercase header 11; role as gray chip 20 h; "Invite pending" blue chip is the only accent besides the primary; hairline rows only; radius 6; menu item 28, destructive red last |
| Dub | [screen](https://mobbin.com/screens/815a00a1-43c7-44ca-b86f-b9af461fbcb6) | Members / Invitations as underline tabs inside one card; invite meta ("Invited 2m") inline | sidebar ≈ 220; card ≈ 1080 wide, radius 10–12, hairline; card header 20/600 + 13 muted; row ≈ 64 (avatar 32, name 13/500 + email 12 muted); role text plain 12; black primary Invite + icon-only copy-link beside it; overflow menu radius 8 with red "Revoke invite" |
| Cal.com | [screen](https://mobbin.com/screens/a77637fa-823b-4b72-a6fe-4092d0710d7d) | bordered table with checkbox column, uppercase role badges, per-row icon acts | sidebar ≈ 215; toolbar controls 32 h (Search / Filter / Display / + Add black); header row gray fill 12/500; row ≈ 54; badge uppercase 10/600 tinted (OWNER blue, MEMBER gray); radius 6; hairline `#e5e7eb`; 1.9 rows/100 |
| Tailscale | [screen](https://mobbin.com/screens/5a7fb227-6974-4ddb-9437-34f7d93e336c) | dark render: invite call-outs as two hairline cards above the table, count chip "2 users" | no sidebar, top tabs; canvas ≈ `#1a1a1a`, cards same surface + hairline ≈ `#2a2a2a`; search 36 h + Status / Role filter buttons; uppercase header 11; row ≈ 62 with avatar 44; ink white / `#9a9a9a`; single blue primary; 1.6 rows/100 |
| Stripe | [screen](https://mobbin.com/screens/3fd05467-0d3e-424f-a76b-1bc3f4c44ec6) | invite dialog with chip email input, grouped role checklist and a role-description pane | dialog ≈ 1290 × 780, two panes split ≈ 55/45; email chips 24 h; role search 28 h; group headers gray fill 12/600; check rows ≈ 36, 13/400; Cancel + purple "Send invites" bottom-right 28 h; radius 6 |

DESIGN.md: `stripe`: type body-md 15/300, body-tabular 14/300, caption 13/400, micro 11/300, button-sm 14/400; radius xs 4 / sm 6 / md 8 / lg 12; border hairline `#e3e8ee`, hairline-input `#a8c3de`; spacing 2/4/8/12/16/24/32. `cal`: type body-sm 14/400, caption 13/500, button 14/600, nav-link 14/500, title-sm 16/600; radius 4/6/8/12/16/pill; border hairline `#e5e7eb`, hairline-soft `#f3f4f6`; surface-soft `#f8f9fa`; spacing 4/8/12/16/24/32/48.

The references span: row 40–64 (invite rows carry a second line for email or "invited 2m"); body 13, meta 12, header 11 uppercase; radius 6–12; separation by hairline rows, at most one bordered card; accent on the single Invite primary and the "pending" chip; destructive act red and last in the row's overflow menu.
