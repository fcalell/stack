---
id: 003-73
status: review
sessions: {}
---
# react-ui: a beside record's headings follow its title below wide

## Goal
Stead opens a lead, a sink, Add a repo, a job and a stage's output beside their section or record (github.com/fcalell/stead, packages/server/src/app). axe reports heading-order at 375 and 768 px, clean at 1440.

## Approach
Below `wide` a `beside` Screen's title becomes the page's h1 while its body's Section headings stay h3 (`header > h3`): at 768 a lead reads H1 Code, H3 Code, H3 Spoken forms; at 1440 H1 System, H2 Code, H3 …. Seen at stack f6563f6.

## Shape
Web only (native's `header` role has no level). Place draws its title's twin `h1` as `sr-only`, shown only where the beside record stands alone (`hidden page-max-tablet:group-has-data-beside/page:block`, the mark `HEAD_BESIDE` reads); the visible head keeps the `h1` with `id={titleId}`.
The Screen loses `ALONE`, `TITLE_UNDER` and its twin `h1`: one `Heading` at `levels.title`, so the outline is `h1` Place, `h{level}` record, `h{level+1}` sections at every width. `screenLevels` keeps its signature; its comment and the ui-core.md beside bullet change.
`overlays.ts` gains the one structural class. No visual change. Same unit as 74 (Screen and Place).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Rework: at 390 no h1 has a box; the Place's `h1` stands in a display:none head with no twin, so the top visible heading is the h2 "History". At 768 and 1440 an h1 stands.
