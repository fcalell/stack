# Onboarding

The range an onboarding flow is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

title 16–24/500–600, subtitle 12–14 muted; progress 2–4 segments 3–6 tall (a continuous bar to ≈ 10) or "Step n of m" at 12; choice cards 190–345 radius 8, selected by a 1 px accent border; inputs 32–36; Continue 28–34, full width when alone; Back and Skip never accented.

## References

Queries: flows `workspace onboarding after signup with a stepper asking for team name, role and invites` · screens `onboarding step page centered card with a progress indicator asking what you will use the product for` · `dark mode onboarding screen in a developer tool with a create your first workspace form and step counter`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Notion | [flow](https://mobbin.com/flows/757b6888-6eaa-498d-9b18-c013c9a2ef4a) | Full-bleed steps: question, three illustrated choice cards with top-right radios, full-width Continue, Cancel top-right | title 24/600; subtitle 14 muted; cards ≈ 230 × 270 radius 8 hairline; Continue ≈ 34 full width blue; inputs ≈ 32 with label 11; no step bar |
| Notion | [screen](https://mobbin.com/screens/99396b7b-c21d-4cea-8956-4942c2b9aae6) | In-app variant: 3-segment progress above the title, stacked option rows with icon + title + description | segments ≈ 5.5 tall; title 22/600; option row ≈ 76 tall radius 8, selected by 1 px blue border; row title 13/500 desc 12; Continue ≈ 34 blue |
| Coda | [flow](https://mobbin.com/flows/a40b6c20-74d3-4a5d-a60b-bba326bb5ab2) | Modal card with illustrated header band, form, Back text left and Next / Skip dark button right | card ≈ 745 wide radius 12; title 20/600; subtitle 13 muted; label 12/500; input ≈ 32; chip-in-input for invitees; footer acts ≈ 30 |
| Lovable | [flow](https://mobbin.com/flows/d092c4b4-3e75-4475-9a48-dc83a386a59c) | One question per step on a dark gradient canvas, dot pager at the bottom, white pill Next | title 22/600 centred; label 11; input ≈ 36 radius 6 ≈ 300 wide; Next pill ≈ 32; dots 4 with active elongated |
| Navattic | [screen](https://mobbin.com/screens/a33b4f74-8bbe-4fb8-8367-060abfcf25b5) | "Step 2 of 3" + segmented bar, card of checkable rows, Skip text + dark Next in the card footer | segments ≈ 3 tall; step label 12; title 20/600; subtitle 13; card ≈ 490 wide radius 8 hairline; rows 60–90 tall with checkbox right; Next ≈ 28 |
| Vapi | [screen](https://mobbin.com/screens/e8106529-4db7-4d84-971c-8d2dbda936d5) | Dark: two-dot progress, 2 × 2 icon tiles, selected tile gets the green border, Back outline + green Get Started | question 16/500 left; tiles ≈ 345 × 240 radius 8; footer buttons ≈ 32; 2 type sizes; accent on selection border and one act |
| Grammarly | [screen](https://mobbin.com/screens/965e4e5e-731a-4408-9e18-9ff0df5ae986) | "Step 1 of 4" text + progress bar centred between the cards and the Next button | bar ≈ 10 tall, a bordered pill filled to the step; title 20/600; subtitle 12; cards ≈ 190 × 100 radius 8 with radio top-left; selected card gets a teal tint + border; Next ≈ 30 |

DESIGN.md: `notion`: type body-sm 14/400, body-sm-medium 14/500, caption 13/400, micro 12/500, micro-uppercase 11/600, heading-4 22/600, heading-5 18/600, button-md 14/500; radius 4/6/8/12/16/20/24; border hairline `#e5e3df`, soft `#ede9e4`, strong `#c8c4be`; spacing 4/8/12/16/20/24/32/40. `lovable`: as above (body 16/400, button-sm 14/400, radius 6 controls, 12 cards, border `#eceae4`).

The references span: title 16–24/500–600, subtitle 12–14 muted; progress as 2–4 segments 3–6 tall (Navattic ≈ 3, Notion ≈ 5.5; Grammarly's continuous bar ≈ 10) or "Step n of m" 12; choice cards 190–345 wide radius 8, selection = 1 px accent border (plus tint in two cases); inputs 32–36; Continue 28–34, full width when the step has one act; Back / Skip as text or outline, never accented.
