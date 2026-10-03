# Version picker

The range a version picker or a history is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

entry 30 one-line to 44–85 history cards; primary 13/500 with 12 muted meta; radius 6–8; selection soft fill or hairline outline; current by chip or check; accent only on Restore.

## References

Queries: `version history panel listing saved versions with timestamps and a restore button` · `dropdown to switch between versions or releases of a document or deployment` · `documentation site version selector menu showing v1, v2, latest, dark mode`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Vercel | [screen](https://mobbin.com/screens/7872f282-32c8-4dbe-bf80-a7fb36fb1833) | rollback dialog: current deployment shown read-only, targets as radio cards with a Current / Previous chip | dialog ≈ 470 wide, radius 8, hairline; radio card ≈ 85 h, 3 lines: id 13/500, commit 12, meta 12 muted with branch + avatar + age; chips 11 uppercase (Current black fill, Previous outline); reason textarea; Cancel + black Continue 32 h |
| Notion | [screen](https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210) | history as a right panel of two-line entries with the selected one filled; single Restore act | panel ≈ 265 wide; entry ≈ 44 (2.3/100), time 13/500 + author 12 muted; selected entry gray fill radius 6, no border; hairline only at panel edge; blue Restore 28 h bottom-right; "Learn more" as link |
| Framer | [screen](https://mobbin.com/screens/6074cf77-b523-4ee5-8046-c7f108612cf6) | list + detail split: selected version outlined with a LIVE pill, detail as label/value stacks | list ≈ 330, detail ≈ 330; row ≈ 62 (age · author 13/500, "7 changes" 12 muted); selected row hairline card radius 8; LIVE blue pill 10/600; status chip READY; View button 28 h full width; 1.6/100 |
| Leonardo AI | [screen](https://mobbin.com/screens/e0cbc005-7d2a-47e3-b7de-33effee96097) | dark dropdown of numbered versions with dates, check on current | trigger ≈ 160 × 38, hairline, radius 6; menu ≈ 160 wide, 15 items ≈ 30 h (3.3/100), 12/400 "v1.5.6 - 14 Apr 2026"; check mark right on current; menu `#1a1a1a` + hairline `#2a2a2a` on canvas `#0f0f0f`; no accent inside the menu |
| Sana AI | [screen](https://mobbin.com/screens/0d1c373e-876d-48f2-b460-54aa375f8b35) | history grouped by day, "Current version" as plain text, restore promoted to the header | panel ≈ 340; group label 12 muted; entry ≈ 66 (date-time 13/500, author with avatar 12); selected entry soft fill radius 8; "Restore this version" black pill 32 h top-right; Highlight changes toggle in footer; 1.5/100 |

DESIGN.md: `vercel`: type body-sm 14/400, body-sm-strong 14/500, caption 12/400, caption-mono 12/400, code 13, button-md 14/500; radius 4/6/8/12/16/pill 100; border hairline `#ebebeb`, hairline-strong `#a1a1a1`; canvas-soft `#fafafa`; spacing 4/8/12/16/24/32/40/48. `notion`: type body-sm 14/400, body-sm-medium 14/500, caption 13/400, micro 12/500, micro-uppercase 11/600, button-md 14/500; radius 4/6/8/12/16/20/24; border hairline `#e5e3df`, hairline-soft `#ede9e4`, hairline-strong `#c8c4be`; surface `#f6f5f4`; spacing 4/8/12/16/20/24/32/40. `framer`: type body 15/400, body-sm 14/500, caption 13/500, micro 12/400, button 14/500; radius 4/6/10/15/20/pill 100; border hairline `#262626`, hairline-soft `#1a1a1a`; canvas `#090909`, surface-1 `#141414`, surface-2 `#1c1c1c`; spacing 4/8/12/15/20/30/40.

The references span: entry 30 (single-line menu) to 44–85 (two- or three-line history cards); primary text 13/500 with 12 muted meta; radius 6–8; selection by soft fill or hairline outline, never accent fill; "current" marked by a chip or check, the accent reserved for the one Restore / Continue act.

Thin evidence: dominated by document-history panels; the true switchers are Leonardo AI and Vercel's rollback dialog; no docs-site version selector surfaced.
