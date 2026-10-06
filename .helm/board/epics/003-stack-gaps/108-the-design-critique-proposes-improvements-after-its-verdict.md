---
id: 003-108
status: backlog
sessions: {}
---
# ui-core: the design critique proposes improvements after its verdict

## Goal
`ui-core/guide/design-critique.md` has the critic "never prescribes a look"; consumers want improvements too. Stead's step 5b screens passed spec and floor reviews with visible polish problems, and the owner asked, for example, whether list rows would read better with a light separator (story 109).

Proposed shape (stack decides): after the verdict, an Improve section where the critic compares the render with the references on the pattern pages it implements (and Mobbin when a page has none) and lists improvements, each citing the reference that shows it and naming where it lands: a look on a roster component (a stack story) or a composition (the app). Improvements never move the verdict.

## Approach
The critique reports what is off against the rubric and stops, so a screen that meets the floor ships with nothing said about how it compares to the references it was built from. A consumer asking for improvements has no step in the guide to ask it in; doing it outside the critique loses the fresh-critic separation and the citations.

## Acceptance criteria
- [ ] The critique guide has the critic list improvements after its verdict, each citing a reference and naming where it lands (roster look or app composition).
- [ ] The guide says improvements never move the verdict.
- [ ] The "never prescribes a look" line is reconciled with it (the verdict still prescribes nothing).

## Open questions
- [ ] Its shape (a section, a separate pass, an option on the critique): the stack session decides.
