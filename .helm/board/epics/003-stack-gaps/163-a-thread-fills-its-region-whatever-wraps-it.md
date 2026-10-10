---
id: 003-163
status: done
sessions: {}
---
# react-ui: a Thread fills the space its region gives it whatever wraps it

## Goal
Stead's conversation screens (github.com/fcalell/stead, `packages/server/src/app/ui/conversation.tsx:1`, which opens: "Renders as a fragment so the `Thread` is the main's direct child, which is how the main knows to fill"; the Thread stands at lines 397 and 635, beside its `header` and `sheet`). A conversation in a Split's main sometimes needs a banner or another part above the Thread in the same region (a state line, a notice about the run), and the Thread must still scroll its own log and pin to the latest entry with its input docked at the foot. Today the app must keep every part a sibling and the Thread the region's direct child, so a part above the Thread cannot share a wrapper with it.

## Approach
A filling Thread marks its root `data-fill`, and the regions read the mark with `:has(>[data-fill])` (`plugin-react-ui/src/ui/components/thread/fill.ts`: `BODY_FILLED`, `MAIN_FILLED`, `COLUMN_FILLED`; `split/index.tsx` line 53 for the main's `shrink min-h-0`). The child combinator matches only a Thread that is the region's direct child, so a Thread inside any wrapper (a `div`, a fragment-turned-element, a component that renders one) leaves the main scrolling as a whole, the page inset and gap on, and the log's scroll and pin-to-latest lost. 003-51 gave the main the Thread's fill; it did not say the fill holds when the Thread is not the direct child. The app cannot restore it with its own wrapper classes without copying the region's fill form, which is a local copy of a stack module.

## Acceptance criteria
- [x] A Thread fills a Place body or a Split's main at 375, 768 and 1440 px as the region's direct child, with a part above it as its sibling, with the log scrolling inside the region and pinned to the latest entry and the input docked at the foot.
- [x] A part placed above the Thread in the same region (a banner, an item header) stays at its place while the log scrolls.
- [x] A region with no Thread keeps its scrolling form.
- [x] The Thread showcase holds a Thread under a banner in a Split's main, measured at 390 and 1440.

## Open questions
- [x] Ruled: no new surface. A part above a Thread is a sibling in the region's fragment, the Thread its direct child; the head pairs with a Banner after it. A wrapped Thread is unsupported on both platforms.

## Built
`headPaired` (react-ui and native-ui `item-header/pair.tsx`) pairs a head with a `Banner` directly after it, facts or not, so the Thread stays the region's direct child and every `:has(>[data-fill])` read and `holdsThread` stand. The rules (both platforms) and `ui-core.md` state the sibling shape and the rejected ones. Stories `ThreadUnderBanner375/768/1440`, `ThreadUnderBannerNoFacts1440` and `ThreadKeepsInputAsBannerToggles` in `apps/showcase/behaviour/split.stories.tsx`. `pnpm check` turbo part and the three verifies pass. Phone check owed: Banner pairs under the head on the Ask place, the Thread fills, the record stays still, a toggling Banner keeps the typed input.
- Toggling a Banner beside a Thread no longer remounts it: `headPaired` keeps each leaf's key by its slot (`Children.forEach`) and returns one keyed list paired or not, on both platforms. The split behaviour stories pass, 30 of 30, `ThreadKeepsInputAsBannerToggles` among them.
- Measured, for the owner: a Banner above a Thread in a Place body with no foot stands flush (left, right and top insets 0, and 0 to the log).

## Cut
The story's title and Goal asked that a Thread fill its region whatever wraps it (a Thread inside a wrapper element or an app component), and the original first criterion named "direct child or inside a wrapper". Only the direct-child form is delivered; a wrapped Thread is unsupported on both platforms. An AI ruling cut it (scratchpad `rulings-7.md`, lines 1 to 8, "Reject all three options as framed. The app's wrapper is the unsupported thing"; the Open question and first criterion were rewritten to match); the owner did not rule it. The gap is in the code today: the regions read `:has(>[data-fill])` and native `holdsThread` reads element types, so a wrapped Thread leaves the region scrolling as a whole. The measured-at-390 showcase and the phone check are also still owed.

## Owner ruling
The owner accepts the cut: a Thread fills its region as the region's direct child (a part above it a sibling), as the rules say. The 390 measure and the phone check still run.

## Review
Suite 2026-10-10: behaviour 422/422 in Chromium, `stack screens test` 180/180, `pnpm check` and every verify pass. Critique pass: a Thread under a banner at 390 and 1440, banner pair gap 8/6, the log scrolls on its own, main scrollHeight == clientHeight; a region without a Thread keeps its scrolling form.
