# Page header with acts

The range a page header with its acts or tabs is measured against in a [design critique](../design-critique.md), and the
executions behind it. Read the measurements as the [references](../references.md) page sets out.

A dialect is the references' number where the system keeps its own; the [judging](../judging.md) page says which hold.

## Range

top strip 30–36 with 12 breadcrumb; title 16–28/500–600 with a muted description at the meta role (the references' 13 is a dialect); acts 24–32 radius 4–6 right-aligned at `gap-acts` (8), at most one filled; tabs 12–13 with a 2 px underline or 24 pill; hairline regions, cards radius 8.

## References

Queries: `page header with a title, breadcrumb and a row of action buttons on the right above a data table` · `settings page heading with a description line and a primary button aligned right plus secondary actions` · `dark mode project overview page header with the project name, status badge, tabs and deploy button`

| App | Screen | Why | Measured |
| --- | --- | --- | --- |
| Linear | [screen](https://mobbin.com/screens/267d16a1-982b-4479-85b5-22294fdab01a) | Thin breadcrumb strip with tabs below, then an in-body title with description and property chips; acts are icon buttons | sidebar ≈ 235; strip ≈ 36 tall hairline; tabs 12 pill 24 tall; title 20/600 under a 24 icon; description 13; chips 12 with 16 icons; no filled button |
| Vercel | [screen](https://mobbin.com/screens/c7fc1aa9-5a08-4993-a979-66c3e729527c) | Card header "Production Deployment" with three acts: two outline, one black split button | sidebar ≈ 235; card radius 8 hairline; header row ≈ 52 tall; label 14/500; acts ≈ 32 tall radius 6; body 13, meta 12 muted; only the last act filled |
| Supabase | [screen](https://mobbin.com/screens/782baf2b-1d87-4a1c-a461-a87acc585ba9) | Dark: 30-tall breadcrumb bar (org / project / branch + PRODUCTION badge + Connect), big title with URL + Copy chip, status tiles | icon rail ≈ 48; top bar ≈ 30 with 12 text; title 28/500; URL 12 mono muted; tiles 11 mono uppercase labels + 14 values; Connect ≈ 24 outline; green only in charts and status |
| Neon | [screen](https://mobbin.com/screens/79370ba2-b39f-4fc1-bd80-a6469e8cc78e) | Title left, three equal outline acts with icons right, stats card under a hairline | sidebar ≈ 235; title 22/600; acts ≈ 30 tall radius 6 outline, text 12/500, gap 8; stats card radius 8 hairline; label 12 / value 15/500 |
| Jira | [screen](https://mobbin.com/screens/1999248d-f1d5-41bf-8c63-f25c6ac7e1de) | Eyebrow breadcrumb, title with icons, tab row, then a toolbar of filter chips; share / expand icons right | eyebrow 11 muted; title 18/600; tabs 13 with 2 px underline; chips ≈ 28 tall radius 4; icon acts 28; primary "+ Create" lives in the global bar |
| GitBook | [screen](https://mobbin.com/screens/8cbf3d6c-0008-4d59-83c5-91a232b47ef5) | Settings title + description, sections as hairline cards, Danger zone red-tinted, Publish black button in the document bar | title 22/600; description 13 muted; section title 14/600 with 12 body; cards radius 8; Save ≈ 26 disabled; Delete red filled ≈ 28; top bar ≈ 30 |
| Sprig | [screen](https://mobbin.com/screens/db287836-e289-46c4-b1e0-8bde34df4adf) | Folder breadcrumb + title on one line, three acts right (Cancel outline, Save Changes outline, Launch yellow) | breadcrumb 14 muted / title 16/600; acts ≈ 30 tall radius 6; yellow fill only on Launch; stepper cards radius 8 hairline ≈ 60 tall |

DESIGN.md: `linear.app`: caption 12/400, eyebrow 13/500, body-sm 14/400, button 14/500, headline 28/600, card-title 22/500; radius sm 6 md 8 lg 12; hairline `#23252a` strong `#34343a`; button padding 8 14; status-badge caption pill 2 8. `vercel`: heading 20/600 and 24/600, body-sm 14/400, body-sm-strong 14/500, caption 12/400, caption-mono 12, button-md 14/500; radius 6/8/12; hairline `#ebebeb` strong `#a1a1a1`; button-secondary canvas + hairline. `supabase`: heading-lg 22/500, heading-md 18/500, caption 13/400, micro 12/400, code 14/400, button-md 14/500; radius 4/6/8/12/16; hairline `#dfdfdf` strong `#c7c7c7` cool `#ededed`; spacing 2/4/8/12/16/24/32/64.

The references span: top strip 30–36 tall with 12 breadcrumb text; title 16–28/500–600 with a 13 muted description; acts 24–32 tall radius 4–6 in a right-aligned row, gap 8, all outline or surface-step except at most one filled (black, brand, or none); tabs 12–13 with a 2 px underline or 24 pill; regions separate by hairline, cards radius 8.
