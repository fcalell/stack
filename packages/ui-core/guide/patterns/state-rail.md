# State rail

The range a rail of fixed states (a known sequence with a position in it) is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out. An [activity feed](./activity-feed.md) lists events that happened; a state rail lists every stage up front, the later ones included.

## Range

stages stacked top to bottom on one rail, 3–6 stages; rows 28–56 desktop, 48–70 touch, a done or current row two lines (label, then its date at 12–13 muted); marks 8–13 dots or 18–30 circles, done filled with a check, current a filled or ringed mark plus the label at 600, later hollow with the label muted at 400; rail 1–3 px, solid through done, grey or dashed after; an ended rail closes on a danger cross with its reason at 12–13 under it; hue on the marks and the done rail only, never the label text.

## References

Queries: screens `application status timeline with a vertical rail of fixed stages, completed stages checked with dates, the current stage highlighted and later stages greyed` · `dark mode deployment or request progress showing a vertical list of fixed steps with done, in progress and pending states` · `request or application status tracker where the process ended early, a rejected or cancelled stage shown in red with its reason closing the vertical timeline` (web, deep) · `order tracking screen with a vertical timeline of stages, delivered steps dated with a check and the next steps grey` (iOS, deep)

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Mercury | [screen](https://mobbin.com/screens/c9e6999a-303b-4026-89f5-0d64934f9ab4) | Application timeline in a side card: Apply, In review, Account ready, each done or current stage with its date or estimate under it | dots ≈ 8; label 13/500, meta 12 muted ("Submitted on Jun 4", "Approx. 1 day"); rows ≈ 56 two-line; rail 2 accent through done and current, none after; later label muted, no meta |
| Gusto | [screen](https://mobbin.com/screens/afd1032f-ef50-460f-88fb-c1e6970ab079) | Setup rail mixing done, current and later stages, each with a due or done date and an act under the current one | circles ≈ 24: done filled check, current half-filled, later hollow; label 16/600, date 13 muted; rail 1–2 solid through done, dashed after; rows 50–130 by content |
| Gamma | [screen](https://mobbin.com/screens/523d6c4f-ac58-44f7-9d7a-a9881cba40f7) | Four numbered stages of an import, the current one with a spinner beside its label | circles ≈ 28: done filled accent check, current outlined with its number, later grey number; label 13/400; rail 2 accent through done, grey after; rows ≈ 118 (sparse) |
| Deel | [screen](https://mobbin.com/screens/27673f71-eb6b-4a45-9e44-fd91545a6bb1) | Application progress card: submitted and review stages as outlined check circles on a grey rail, each opening its detail | check circles ≈ 18 outline; label 13/500; rail 1 grey; detail block under a stage on a grey card, date 12 |
| CVS Health | [screen](https://mobbin.com/screens/6ade5a53-e2a8-423e-b5d9-c135e5bf010c) | Phone: Order placed, Processing, Shipped, Delivered under an estimated-delivery line | circles ≈ 28 pt: done outlined check, current filled green ring, later hollow grey; label 17/600 done and current, 17/400 grey later; rail 3 dark through done, grey after; row pitch ≈ 69 pt |
| IKEA | [screen](https://mobbin.com/screens/21cf4ffd-015b-46a1-b497-bef90964b3d2) | Phone: four stages, the current one bold with a sentence and a Reschedule act under it | dots ≈ 13 pt: done filled black, current filled accent, later hollow grey; label 17/400, current 17/600; description 15 muted; rail 1–2 grey; rows ≈ 65 pt |
| lululemon | [screen](https://mobbin.com/screens/b160a22c-0dba-4e46-886a-f095ba5ef062) | A cancelled order: the track ends on a danger cross with its consequence under it | cross ≈ 16 in a danger disc; reason 12/500 danger; track tinted danger-soft, no later stages drawn |

DESIGN.md: none of the cited products (Mercury, Gusto, Gamma, Deel, CVS Health, IKEA, lululemon) is in `VoltAgent/awesome-design-md`.

The references span: 3–6 stages on one vertical rail; rows 28–56 desktop and 48–70 touch; marks as 8–13 dots or 18–30 circles, done filled or checked, current filled, ringed or bold, later hollow and muted; labels 13–17 at 400–600 with the date or estimate at 12–13 muted under done and current stages only; the rail 1–3 px, solid or hued through done, grey or dashed after; an ended rail closes on a danger cross with its reason (lululemon, and Airtasker's [cancelled task](https://mobbin.com/screens/327b8773-f6bc-4367-8e49-9424c97489cf) as a status line) and draws no later stages.
