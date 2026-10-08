---
id: 003-108
status: done
sessions: {}
---
# ui-core: the design critique proposes improvements after its verdict

## Goal
`ui-core/guide/design-critique.md` has the critic "never prescribes a look"; consumers want improvements too. Stead's step 5b screens passed spec and floor reviews with visible polish problems, and the owner asked, for example, whether list rows would read better with a light separator (story 109).

Proposed shape (stack decides): after the verdict, an Improve section where the critic compares the render with the references on the pattern pages it implements (and Mobbin when a page has none) and lists improvements, each citing the reference that shows it and naming where it lands: a look on a roster component (a stack story) or a composition (the app). Improvements never move the verdict.

## Approach
The critique reports what is off against the rubric and stops, so a screen that meets the floor ships with nothing said about how it compares to the references it was built from. A consumer asking for improvements has no step in the guide to ask it in; doing it outside the critique loses the fresh-critic separation and the citations.

## Acceptance criteria
- [x] The critique guide has the critic list improvements after its verdict, each citing a reference and naming where it lands (roster look or app composition).
- [x] The guide says improvements never move the verdict.
- [x] The "never prescribes a look" line is reconciled with it (the verdict still prescribes nothing).

## Open questions
- [x] Its shape (a section, a separate pass, an option on the critique): a section in the same run, after `## Report` (see Ruled).

## Ruled
An `## Improve` section after `## Report`, written by the same fresh critic in the same run: not a separate pass (it would lose the render, the measurements and the opened references) and not an option (a new flag that leaves the default critique silent). It is a different kind of line from the findings, so improvements never leak into blockers and rework. Each line cites a reference from the pattern pages of the patterns the unit implements (Mobbin only when a page has none or its stand-in note says its shortlist is thin), states the reference's measured property against the render's, invents no value, and names where it lands: a roster look (a stack story) or a composition (the app). At most about five lines; "none" is valid.

## Built
`packages/ui-core/guide/design-critique.md`: the intro separates the verdict (prescribes no look) from the improvements (comparisons with references, evidence); the report block gains an `improve` group marked "after the verdict, never moves it"; the new `## Improve` section sets the rules above; "A phone screen" says the section applies as on the web. Roster files are unchanged. Evidence: `pnpm check` (turbo build, check-types, test; Biome run over the tree) passes.
