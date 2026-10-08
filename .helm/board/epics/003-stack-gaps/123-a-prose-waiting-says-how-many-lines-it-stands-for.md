---
id: 003-123
status: done
sessions: {}
---
# react-ui: a waiting Prose stands for the lines the text will have

## Goal
Stead's Action item draws "Why it waits" as a `Prose` of one sentence (github.com/fcalell/stead, `packages/server/src/app/ui/item-screen.tsx`, the waiting form `BodyWaiting` and the loaded `<Prose markdown={why} />`; design/07-interface.md "Items", a loading screen keeps its loaded height). Waiting, the section draws five line bars (two paragraphs, 3 + 2 on desktop and 3 + 3 on touch); loaded it draws one line, so the page changes height on load. `Prose` takes no say over how many lines it stands for. Evidence: item screens critique unit u4 (Stead scratchpad `critique/u4/`, stack at `5564217`).

## Approach
`Prose loading` draws the fixed `BARS` constant (plugins/react-ui/src/ui/components/prose/index.tsx): two paragraphs of three lines, the second's middle line on touch alone, with no prop for a count. A `Prose` whose text is a sentence or a paragraph cannot wait at its own height, and the app cannot size the stand-in from outside, since geometry classes go on host elements only. 003-34 (a Group's waiting rows) and 003-32 (a Diff's waiting height) set the same rule for those parts; `Prose` has no such cell. Not 003-88 (the measure). Seen at stack `5564217`.

## Acceptance criteria
- [x] A waiting `Prose` can stand for a given number of lines (or paragraphs), so a one-line text waits as one line bar and a longer one as its lines. (`Behaviour/Waiting` `ProseOfOneLine`, `ProseLineCount`, and the Touch story)
- [x] Without the count it keeps today's two paragraphs. (`ProseLineCount`: `loading` draws two paragraphs, `loading={3}` one of three lines)
- [ ] The Prose showcase holds a one-line waiting form beside the loaded one and the critique measures both heights.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether a `lines` prop, a `lines` of paragraphs, or a variant of one short paragraph.

## Decided while building (2026-10-07)
Not built: the shape is a consumer-surface choice, so it waits for a ruling. Built meanwhile (003-131, 003-132): the waiting contract every part follows, that a part draws its waiting form when its own `loading` or the `LoadingContext` of the loading Group or Section holding it is set, and builds the form from the props it is given. `Prose` now takes that inherited loading, so a loading Section over a `Prose` shows the Prose's own form; its form is still the fixed two paragraphs. The count of lines is a fact the app has and the part cannot derive (`markdown` is empty or stale while it waits), so it needs a prop: a `lines` count on `Prose` read while it waits (an absent count keeps the two paragraphs), or `loading` taking the count (`loading={1}`; `true` the default). Recommended: `loading` as the count, the same rule as 003-139's acts, and no new name.

Ruled and built (2026-10-07): `loading` stays a boolean on every part, except where the loaded size is a count of drawn units the app knows and the part cannot derive. `Prose` takes `loading?: boolean | number`: `true` is the two paragraphs, a number from 1 is that many lines of one paragraph (the last half the measure), and `0`, a count under 1 and `false` are not waiting (`loading={rows?.length}` is the trap: it reads the loaded text at 0). One ui-core helper, `waitCount(own, inherited, fallback)` in `list-state`, returns undefined when not waiting and the count when waiting, and both platforms call it. A loading Group or Section hands down a boolean through `LoadingContext`, so an inheriting Prose draws the default; a count is set on the Prose itself. The roster notes it, the `ui-core.md` canon states the rule, and both `rules.md` pages and the prop docs say it. The Prose frame's `Loading` state holds a one-line Section waiting beside the loaded one; the critique measures them. Proven in `apps/showcase/behaviour/waiting.stories.tsx` at 1280 and in a 375 px phone: the one-line Section's height equals the loaded one's, `0` shows the loaded text.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/section/report.md`).
