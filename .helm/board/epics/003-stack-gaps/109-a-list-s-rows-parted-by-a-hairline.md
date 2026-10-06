---
id: 003-109
status: backlog
sessions: {}
---
# react-ui: a List's rows parted by a hairline

## Goal
A bare `List` draws its rows with no separator, while `Group` parts its rows with hairlines. Stead's lists are bare Lists: the Now list (`routes/_now/-components/now-list.tsx`), Chats, and the Work board list. In the 1440 light renders (`signoff/now-1440-light.png`, `chats-1440-light.png`) the Now list shows 9+ two-line rows (status glyph, bold title, age at the top right, meta line with a status dot and word below) and Chats shows rows of title, quoted preview and age/status, each row parted from the next only by about 14 px of whitespace; the eye must find row edges by the titles alone, and the list reads as a column of text beside the hairlines of the sidebar and the split.

## Approach
References both ways (the stack guide's `patterns/` pages and Mobbin):
- No dividers: `patterns/activity-feed.md` cites Linear (inbox rows about 54 px, "no lines between events", "no dividers"); `patterns/dark-mode.md` cites Linear settings groups "no hairlines at all" and Frame.io "no hairlines between" surfaces; Mobbin [Notion Mail inbox](https://mobbin.com/screens/fcbc3ac5-67b3-4732-bb12-999172202799) (dense one-line rows, no lines), [Whop messages](https://mobbin.com/screens/3c5c1c5d-e200-49eb-b295-6b99bcc4a968) (two-line rows, whitespace only), [Gorgias inbox](https://mobbin.com/screens/4c6602d3-2996-4eb0-b7c5-53a864a32dc3) (three-line rows, whitespace only).
- Hairlines: `patterns/data-table.md` ("horizontal only in lists", Airtable; Notion, Supabase, Twenty with grids), `patterns/chips-and-statuses.md` (Vercel deployment list rows, hairline `#2e2e2e`), `patterns/dark-mode.md` (Vapi table rows hairline `#1f1f1f`), `patterns/density.md` (full hairline grid); Mobbin [Dribbble messages](https://mobbin.com/screens/c411980f-834f-4a96-adbb-21a31462f269) (tall two-line rows each parted by a full-width hairline).
The pages split by row height and density: the guide's no-line references are single-line or tight inbox rows with a hover fill; the hairline references are table-like or tall rows. Stead's rows are two-line at about 69 px in a 440 px split list. The Mobbin search did not surface a two-line row list at that width with hairlines in a split pane; the stack session should run its own.

## Acceptance criteria
- [ ] A List's rows are parted so row edges read at a glance in the Now, Chats and Work board lists, light and dark.
- [ ] The choice is stated in `rules.md` with the references that justify it.

## Open questions
- [ ] Separators always, by density, or a List option: the stack session decides.
