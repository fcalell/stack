---
id: 003-70
status: review
sessions: {}
---
# react-ui: a file row's path keeps its start beside its chip

## Goal
Stead's review lists sensitive files with a chip saying why each is listed (github.com/fcalell/stead, packages/server/src/app/ui/review.tsx; design/07-interface.md "The review screen"). At 375 px the row draws "ome.jso" for biome.json and "d./flags.md" for docs/flags.md, with room to spare.

Evidence, item screens critique unit u4 (main 54deb15, shots `r3-else-390-dark`, `blocked-tap-390-light`): still reproducing at this pin. At 390 the sensitive rows draw the path cut to "b… me.json" and "do… flags.md" while the chip is also cut ("what the check …"), and about 120 px right of the +N count stays empty (the count sits at x of about 320 of 390): the row has width to spare yet cuts both, and the count lane is not right-aligned.

## Approach
The app passes `path` and `chip` as FileRow's props ask; the cut happens inside FileRow's path parts, which lose the path's start rather than yielding it whole beside the chip (rules.md: the chip stays whole and the path yields). Seen at stack f6563f6.

## Shape
A fix and one contract rule, no new prop, token or cell. Web bug: the name's tail stops claiming its start (`tail = min(ext + TAIL_LEAD, name.length - TAIL_LEAD)`) and `PATH` gains `overflow-hidden`, so nothing spills under the chip. Native already clips.
Rule, both platforms: the path never yields below its name's floor (the whole name when short, else the first `TAIL_LEAD` characters, an ellipsis and the tail). Order of yield: the directory (to nothing), then the name to its floor, then the chip's label truncates; the counts never yield. Web floor in `ch` as an inline min-width and `CHIP` shrinking by weight (the ListRow precedent); phone floor `n x figures / 4` px and a shrinking chip View.
The chip is never whole-or-gone here: it is why the row is listed. Web `overlays.ts` gains `shrink-<weight>`; the knowledge FileRow bullet and both rules lines change. A critique judges the chip truncating on a narrow row.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.
