# Activity feed

The range an activity feed or a timeline is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

## Range

event rows 20–28 at 11.5–12; comment rows 40–72; body 12–13, actor 500–700; day groups by chip or grey label, never cards; state changes as 18–20 outlined chips with "→"; accent absent.

## References

Queries: `activity feed timeline listing recent events with avatars, action text and relative timestamps` · `issue activity history showing who changed status, assignee and comments in a vertical timeline with icons` · `dark mode activity log or audit log of events grouped by day with timestamps` · `Linear issue detail page with activity section showing status changes and comments`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/16e4d0c7-bf36-4daa-98f5-d3d31882cfec) | Activity block under the issue: 16 px status icon, one 12 px sentence with actor bold and "· 10d ago" muted, no lines between events, comment box below | inbox list ≈ 380 with rows ≈ 54; activity row ≈ 24 (≈4.2 rows/100 px), 12/400 with actor 12/500, meta grey; status icons colour-coded (yellow in-progress, blue done); no dividers, no avatars; composer card radius 8 hairline; accent absent |
| Basecamp | [screen](https://mobbin.com/screens/b71d21b5-1078-44a4-adb3-9583531a6059) | day headers as black label chips on a hairline rule, a vertical 1 px line with 20 px icon dots, time in the left gutter, avatar + bold actor + link verb | content column ≈ 1040; day chip ≈ 24 h black fill 11/700 uppercase; event row ≈ 40–64, body 13/400, actor and object 13/700; left time gutter ≈ 80 at 12 grey; blue circular icons on the line; radius 4 on chips; "No activity" days kept as one-line rows |
| incident.io | [screen](https://mobbin.com/screens/9a03356b-daf2-4c06-95a6-facc978430ae) | activity log drawer: search field on top, date group label, each event a coloured 16 px icon, bold title, time in grey, then a row of small status chips (Critical · Investigating → Fixing) | drawer ≈ 740; search ≈ 36 radius 6; event ≈ 60–72, title 13/600, body 13/400, chips ≈ 20 h 11/500 grey outline radius 4 with arrows between old → new; left column icons in red/blue/black; no vertical rule; accent none |
| Plain | [screen](https://mobbin.com/screens/399cc7cd-e9d4-44ee-af18-5cdaca859af5) | thread timeline with 12 px system rows ("You changed status to Waiting for customer · 15min ago") between message cards; label changes render the label as an outlined chip inline | three-pane 220 / 560 / 380; system row ≈ 20 (≈5 rows/100 px), 11.5/400 grey with 14 px icon; inline chips ≈ 18 h outline radius 4; message cards radius 8 on hairline, note card yellow fill; done row green fill; body 13; accent on the yellow "Done" summary and nowhere else |
| Better Stack | [screen](https://mobbin.com/screens/76f87fea-775d-47e6-b97a-b2d234f6c46b) | dark incident timeline: composer first, then rows with a 16 px event icon, 20 px avatar inline in the sentence, absolute time right-aligned in muted grey | sidebar ≈ 200; timeline ≈ 1100; row ≈ 28 (≈3.6 rows/100 px), 12/400 `#c8cdd3` on `#12151c`, actor 12/500; comment cards on a step-lighter surface radius 8, 1 px `#262b35`; attachment chip radius 6; no vertical line; accent none |

DESIGN.md: `linear.app`: type body-sm 14/400, caption 12/400 lh 1.4, eyebrow 13/500 +0.4, button 14/500, mono 13/400; radius xs 4 (chips, badges) · sm 6 · md 8 (buttons, inputs) · lg 12 (cards) · pill; border hairline `#23252a`, hairline-strong `#34343a`, hairline-tertiary `#3e3e44` (dark); spacing 4 · 8 · 12 · 16 · 24 · 32 · 48.

The references span: system-event row 20–28 px at 11.5–12 px, comment/message rows 40–72; body 12–13 with actor at 500–700; day grouping by a chip or grey label, not by cards; vertical rule optional (Basecamp) and mostly absent; state changes rendered as 18–20 px outlined chips with "→"; accent never on the feed.

Thin evidence: Linear's feed screens hold one to four lines; the dense timelines come from Basecamp, incident.io, Plain and Better Stack.
