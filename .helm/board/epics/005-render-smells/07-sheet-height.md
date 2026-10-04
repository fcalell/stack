---
id: 005-07
status: review
sessions: {}
---
# native-ui: a sheet knows it stands full height before it presents

## Goal
A `TextArea` in a sheet tells the sheet to grow from a mount effect, `useEffect(() => grow?.(),
[grow])` at `components/text-area/index.tsx:54`, through `GrowContext` (`sheet/base.tsx:81-85`,
`:152`) into SheetBase `tall` state (`:384`, `:388`). gorhom mounts the content only once
presented, so the sheet opens content-tall, then turns off dynamic sizing and re-snaps to full
height (`:426`, `:482-484`) after first paint. `tall` is never cleared, so a wizard's next page
without a TextArea stays full height. The web has no counterpart.

## Approach
Decided by fcalell (2026-10-04): a frame learns what its children need up front, through props
or slots, never from a layout effect or a post-paint state push; a registration that must stay
(the parent cannot know a child's kind statically) is read in render from a host object.

The caller knows it places a TextArea, so the sheet takes its height as a prop that feeds
`snapPoints` and dynamic sizing before `present()`, and follows the prop per page. `useSheetGrow`,
`GrowContext`, `grow` and the TextArea's effect go. The prop is a last-resort public surface
(`.helm/knowledge/product/philosophy.md`): prefer deriving it from a declared sheet part where
one exists.

Decided (the recommended answer, applied 2026-10-04): the full height is derived from what the sheet holds; a public height prop is not added.

## Acceptance criteria
- [x] (test) `TextArea` reads no sheet context, and `SheetBase` has no `grow`.
- [ ] (live) on the harness, a sheet holding a TextArea (the Notes sheet in `apps/phone`, given a body field) opens at full height in its first frame, and a next page without one returns to content height.

## Progress
Built; `pnpm check` and `pnpm verify` pass. SheetBase walks its children in render for a TextArea (including a FormField's control); a TextArea inside an app's own component is not seen, so that sheet stays content-tall. Open: the phone live criterion on the harness.
