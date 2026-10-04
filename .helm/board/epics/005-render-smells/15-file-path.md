---
id: 005-15
status: backlog
sessions: {}
---
# react-ui, native-ui: a FileRow's path fits by layout, not by measure

## Goal
`FileRow`'s `Path` starts with `room = Infinity`, measures its box, then cuts the path in script
and renders again. Web (`components/file-row/index.tsx:100-118`) measures with a canvas
`measureText`, a ResizeObserver and `document.fonts.ready`: when the mono face loads late the
path re-cuts after first paint and shifts. Phone (`file-row/index.tsx:97-129`) draws the uncut
path first, its parts `shrink-0` in an unclipped box (`:31`), so a long path overprints the counts
lane until `onLayout` (`:107-110`) reports a width; it also assumes a mono advance
(`fontSize * MONO_ADVANCE`). Every row renders twice on mount and again on each width change.

## Approach
The rule, the directory gives way first and then the name is cut in its middle, is layout. The
directory is a shrinkable one-line part with a high shrink factor, ellipsizing at its tail; the
name is a gentler-shrinking part cut in its middle (web: a truncating stem and a `shrink-0` tail
holding its last characters; phone: `ellipsizeMode="middle"`), in a `min-w-0` row. The state, the
measures, `cut()` and `middle()` go.

## Acceptance criteria
- [ ] (live) web, changes' file rows at 1440 and 375 with the mono face delayed: the path never re-cuts after first paint, and the extension stays whole.
- [ ] (live) phone, on the harness at 390 and 320 dp: the first frame draws the cut path, clear of the counts.
