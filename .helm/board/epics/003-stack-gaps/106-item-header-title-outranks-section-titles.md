---
id: 003-106
status: review
sessions: {}
---
# react-ui: a record's ItemHeader title outranks its Section titles

## Goal
A record's name must read one level above the section headings under it. In a `Split` main or on an item screen, `ItemHeader`'s title and a `Section`'s title draw at the same size and weight (the `heading` text role: 1.154 size, 1.3 leading, semibold, `ink-body`; about 16px semibold), so the name and its first section heading read as one level. Seen in the stead app (repo stead, `packages/server/src/app/routes/system/route.tsx` and `packages/server/src/app/ui/item-screen.tsx`):
- The System section "Rules" in a `Split` main: the `ItemHeader` title "Rules" and the section title "Read hosts · …" below it match (rules-375-light.png).
- The item screen of a stopped job: the `ItemHeader` title "“Load covers from the cache first”" and the section title "What happened" match (item-stopped-answer-1440-light.png).

With no facts line, the head is the title alone, and the record body's `gap-sections` step (`SPLIT_MAIN` state `rest`: `gap-sections p-page`; the sections role is 10 units on touch, 8 on desktop) leaves the header about 60px above its first `Section`, so the head reads detached from the record it names instead of as its title.

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), shot repo-1440-light-a: the repo name stands in the Screen head (18/600) and the ItemHeader (15/600), and the Commands and Landings section titles also draw 15/600, so the ItemHeader title does not outrank its sections.

## Approach
Both parts draw the same role, so nothing in the app can separate them without a host element or a token override, which is a workaround:
- `ItemHeader` (`plugin-react-ui` `item-header/index.tsx`) draws its title as `<Heading className={text({ role: "heading" })}>`; its own gap is `ITEM_HEADER` = `gap-pair` between overline, title and facts.
- `Section` (`section/index.tsx`) draws its title as `text({ role: "heading" })` with `SECTION_TITLE` = `gap-inside` for the title line.
- `SPLIT_MAIN` (`ui-core` `variant-tables.ts`) spaces its children, the head included, at `gap-sections`. The head is one child among the record's sections, so it takes the same step as two sections apart.
- The `title` role is larger than `heading` in the roster ("`title` and `heading` already sit at or above it"), so a part exists to draw a record's name higher; `ItemHeader` does not use it.

## Acceptance criteria
- [x] An `ItemHeader` title reads a clear level above a `Section` title beside it, in a `Split` main and on an item screen, on every platform the app runs on.
- [x] With no facts line, the head stands a pair or a fields step above the record's first `Section`, not a sections step, so it reads as the record's title.
- [x] A record whose head has facts keeps its facts line under the title at `ITEM_FACTS` rhythm.
- [x] The loading head (`loading`) keeps the loaded head's height.

## Open questions
- [x] Its shape (the title in the `title` role, a distinct head role, or a head spacing token): the stack session decides.
- [x] Whether the head-to-first-section step belongs to `SPLIT_MAIN`, to `ItemHeader`, or to the record body.

## Built
`ItemHeader`'s title takes the `title` role (18 desktop, 22 touch) in both plugins, and its loading bar stands in the `title` line box (`LINE_BOX.role.title`, new). No size joins the scale, and the role doc reads "a page's or a record's name" (`README.md`, `design-md.ts`, `tokens.ts`, regenerated `DESIGN.md`).
With no facts line a head in a Split's main stands a pair above what follows, not a sections step. The contract holds no variant (verify c20, c21), so `SPLIT_MAIN` cannot carry the sibling rule: the web head draws it as an overlay keyed on its main (`group/main`, off while a Thread fills it), and the native head reads `ThreadBleeds` and `ThreadRoom`. A head with facts keeps the sections step and its facts at `ITEM_FACTS`. The loading head keeps its structure. The Split frame's main holds an `ItemHeader` over its first Section.
Measured at 1200 (desktop): the title draws 18/600 over the Section title's 15/600; a bare head's title stands 6 px above its first Section, a head with facts 32 px. An item screen (a `Screen` body, `PAGE_BODY`) keeps the sections step, since the rule is the Split main's.
Evidence: `stories/ItemHeader.stories.ts` and `stories/Split.stories.ts` pass; `ui-core`, `plugin-react-ui` and `plugin-native-ui` verify pass.
