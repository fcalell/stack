---
id: 005-01
status: review
sessions: {}
---
# react-ui, native-ui: the Shell knows a Screen covers the tabs and a Place's act floats before first paint

## Goal
A pushed `Screen` tells the Shell it covers the tab bar from a passive effect, `cover(true)` (web
`components/screen/index.tsx:78-82`, phone `screen/index.tsx:58-62`), into Shell `covered` state.
The first frame draws the tab bar, then it unmounts and the body grows; on pop it returns late.
A touch Place with a floating act pushes `floats(true)` the same way (web `place/index.tsx:225-230`,
phone `place/index.tsx:130-134`) into Shell `lifted` state, so a queued toast stands at the wrong
height for a frame, then jumps by the act's room.

## Approach
Decided by fcalell (2026-10-04): a frame learns what its children need up front, through props
or slots, never from a layout effect or a post-paint state push; a registration that must stay
(the parent cannot know a child's kind statically) is read in render from a host object.

- **Web**: the Screen root carries `data-screen` and a floating act's layer `data-act-floats`;
  the Shell column hides the tab bar and adds the act's room with `group-has-[…]/column`
  variants, right at first paint and across the density line. `CoverTabs`, `ActFloats`,
  `covered`, `lifted` and both effects go.
- **Phone**: the Shell derives covered and lifted from what it renders (the current route, the
  Place's props), or reads them in render from a host object.

## Acceptance criteria
- [ ] (live) web, `/layout` deploys and places at 375: a Screen route's first frame has no tab bar; a toast raised before a floating-act Place mounts stands above the act in the first frame.
- [ ] (live) phone, on the harness at 390 dp: pushing and popping a Screen shows no tab-bar frame, recorded frame by frame.

## Progress
Built; `pnpm check` and `pnpm verify` pass. Web live at 375 touch, frame by frame: no Screen frame draws the tab bar, and a toast standing as an act Place remounts never covers the act. Phone: the tab bar is a slot each Place draws; the toast layer is still placed by one measure, left to 005-04. Open: the phone live criterion on the harness.

## Critique
Unrendered: the first frame is not capturable from a static render; the end state (no tab bar under a pushed Screen) holds.
