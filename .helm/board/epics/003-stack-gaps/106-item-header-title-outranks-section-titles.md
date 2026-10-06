---
id: 003-106
status: backlog
sessions: {}
---
# react-ui: a record's ItemHeader title outranks its Section titles

## Goal
A record's name must read one level above the section headings under it. In a `Split` main or on an item screen, `ItemHeader`'s title and a `Section`'s title draw at the same size and weight (the `heading` text role: 1.154 size, 1.3 leading, semibold, `ink-body`; about 16px semibold), so the name and its first section heading read as one level. Seen in the stead app (repo stead, `packages/server/src/app/routes/system/route.tsx` and `packages/server/src/app/ui/item-screen.tsx`):
- The System section "Rules" in a `Split` main: the `ItemHeader` title "Rules" and the section title "Read hosts · …" below it match (rules-375-light.png).
- The item screen of a stopped job: the `ItemHeader` title "“Load covers from the cache first”" and the section title "What happened" match (item-stopped-answer-1440-light.png).

With no facts line, the head is the title alone, and the record body's `gap-sections` step (`SPLIT_MAIN` state `rest`: `gap-sections p-page`; the sections role is 10 units on touch, 8 on desktop) leaves the header about 60px above its first `Section`, so the head reads detached from the record it names instead of as its title.

## Approach
Both parts draw the same role, so nothing in the app can separate them without a host element or a token override, which is a workaround:
- `ItemHeader` (`plugin-react-ui` `item-header/index.tsx`) draws its title as `<Heading className={text({ role: "heading" })}>`; its own gap is `ITEM_HEADER` = `gap-pair` between overline, title and facts.
- `Section` (`section/index.tsx`) draws its title as `text({ role: "heading" })` with `SECTION_TITLE` = `gap-inside` for the title line.
- `SPLIT_MAIN` (`ui-core` `variant-tables.ts`) spaces its children, the head included, at `gap-sections`. The head is one child among the record's sections, so it takes the same step as two sections apart.
- The `title` role is larger than `heading` in the roster ("`title` and `heading` already sit at or above it"), so a part exists to draw a record's name higher; `ItemHeader` does not use it.

## Acceptance criteria
- [ ] An `ItemHeader` title reads a clear level above a `Section` title beside it, in a `Split` main and on an item screen, on every platform the app runs on.
- [ ] With no facts line, the head stands a pair or a fields step above the record's first `Section`, not a sections step, so it reads as the record's title.
- [ ] A record whose head has facts keeps its facts line under the title at `ITEM_FACTS` rhythm.
- [ ] The loading head (`loading`) keeps the loaded head's height.

## Open questions
- [ ] Its shape (the title in the `title` role, a distinct head role, or a head spacing token): the stack session decides.
- [ ] Whether the head-to-first-section step belongs to `SPLIT_MAIN`, to `ItemHeader`, or to the record body.
