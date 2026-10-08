---
id: 003-163
status: backlog
sessions: {}
---
# react-ui: a Place with a docked foot keeps its height in a column of auto height

## Goal
A `Place` with a `foot` makes its region a size container (`REGION_FOOTED = "[container-type:size]"`, `plugin-react-ui/src/ui/components/place/index.tsx:96`), so the docked Sheet can bound its body by `cqh`. A size container takes no height from its content, so a footed Place inside a column without its own height collapses to its head. The body and foot then overflow the frame and draw over whatever stands below it. It has happened twice in the showcase: the Place frame and the ActionBar Publish frame each drew their light and dark modes on top of one another, and axe read 1.07 contrast on the overlap. Both frames now pin a height (`Column height="h-185"`, `showcase/frames/place.tsx:208`, `showcase/frames/action-bar.tsx:90`), and the Place comment makes a "column of its own height" the caller's job. An app hits the same thing whenever it nests a footed Place where the height is not set from outside, such as a Section, a card, or a page that scrolls.

## Approach
The size container exists for one reader: the docked Sheet's body, `BODY_DOCKED = "min-h-[calc(var(--spacing-row)_*_3)] max-h-[40cqh]"` (`sheet/docked.tsx:55`). The phone reaches the same bound without a container query: `FootRegion` measures the region and passes its height to the foot (`native-ui/src/ui/lib/frame.ts`). There are two candidate shapes:
- Bound the docked body without containing the region's size: an `inline-size` container, or a bound measured from the region the way the phone does it.
- Keep the size container and give the region a height of its own wherever its parent has none.

Either way, the two pinned showcase heights go, and so does the Place comment's rule for callers. A Thread's `FILL` is also a size container (003-129) and is checked against the same case.

## Acceptance criteria
- [ ] A footed Place in a column of auto height draws its head, body and docked foot without overflowing the column, at 375, 768 and 1440 px, in both modes.
- [ ] The docked Sheet's body still keeps three rows at least and two fifths of the region at most (`DockedBodyKeepsThreeRows` and `DockedWithRoomFitsItsPage` pass).
- [ ] The Place and ActionBar showcase frames stand without a pinned height, and the stories pass axe in both modes.
- [ ] The Place comment no longer asks the caller for a column of its own height.

## Open questions
- [ ] Which bound the docked body reads, if not the region's size container. Recommended: the one that adds no measure on the web, if `cqh` can be replaced at all; otherwise a measured region height, the same shape as native's `FootRegion`.
