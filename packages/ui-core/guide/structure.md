# Structure: how a component is built

How a component is built, as the [rubric](./rubric.md) is how it looks. Read each rule as a rule
while building; a reviewer and the design critic answer its question item by item. A finding
names the rule, the place (`file:line`, or the element's path), the measured value, the expected
value and the fix.

"Held by" names what fails the change: a `verify` check (each package's `pnpm verify`, on web
and native alike unless said), the render walk of `stack screens test` (every page's elements at
320, 1280 and 1920, light and dark), or *judged* where no machine check exists. A closed list a
check holds is edited in the check, with its one-line reason; an entry nothing matches fails too.

## Layout

| # | Rule | Ask | Held by |
| --- | --- | --- | --- |
| 1 | A parent lays out its children with flex, never grid, so the phone mirrors it; a child sets only its own flex item properties. | Does an element place a sibling, or another component, by a margin, an offset or a fixed measure? Is any element `display: grid`? | judged; render walk (`align-grid`, report-only until `ALIGN_FAILS`) |
| 2 | A component's root carries no margin; the parent's gap spaces it, and the root's inset is its own padding. | Does a root carry a margin, a negative one cancelling a parent's inset included? | render walk (margin on a component root) |
| 3 | A component styles its own box and the parts it draws: no selector (`[&>…]`, `[&_…]`, `*:`) reaches a child it does not own. | Does a class string select what another component draws? | judged |
| 4 | Heights, gaps, insets and radii are the contract's values at the density; a surface inside another is rounded by the outer radius less its inset, except a control, a row or a chip (6, 6, 4) inside a card, a popover or a sheet (8), which keep their roles' radii as the walk's named exception. | Is each measured value the one the contract emits, and the inner radius the outer less the inset unless it is that exception? | render walk (contract heights, gaps, insets, radii, nested radii) |
| 5 | No literal length stands in a class: `calc()` over `var(--…)` tokens, `1lh`, `0px`, selector variants and track lists stay. | Does an arbitrary value (`-[…]`) hold a number with a length unit, or a bare number of 1 or more? | `b-arbitrary`; `b5` holds every spelled class against the allowlist |
| 6 | A component adapts to its container with a container query or `flex-wrap`; the viewport reaches it only through the density (`touch:`). | Does a read of the window or a media query choose a form where the container decides? | `b-measure` for the read; judged for the class |
| 7 | Nothing measures in JavaScript outside the closed list: the Canvas, the docked sheet's region, the Pane head's fold (its row and acts, so the acts that do not fit beside the title's floor go to the more menu) and a list row's marks fold (its row, text group and marks, so the marks that do not fit whole beside the text group's floor fold away), the Table's page width, the Thread's follow, `useScrolls`, the density and motion queries, and on native every layout read. | Does the file read a box, observe a size or match a media query, and is it listed with a reason? | `b-measure` |
| 8 | A clipped flex item never shrinks below its content, and a clip hides nothing a layout error put there. | Is a clipped element shorter than its content, with no ellipsis or clamp to say so? | render walk (clipping) |
| 21 | A row is a flex group of groups, `ROW_TEXT` and `ROW_END`: a text group (label over description) and an end group (value, status, control, act, chevron) centred on the row; room that holds an alignment is a group's gap or padding, never an empty element, so a row with no end item reserves none; texts of different sizes on a line share a baseline. | Do a row's end items stand on its centre? Does an element take room and draw nothing? Does a count centred by its line box ride off its heading's baseline? | render walk (`align-centre`, `align-dead`, `align-baseline`; report-only until `ALIGN_FAILS`); no CSS grid anywhere in react-ui (`align-grid`) |

## Reading

| # | Rule | Ask | Held by |
| --- | --- | --- | --- |
| 9 | No component reads its children: no `Children`, `cloneElement`, `isValidElement` or `.type ===` on a React element. Structure arrives as a prop. | Does a walk of `children` decide anything? | `b-children` |
| 10 | No Section stands in a Section. | Does a Section's body draw a Section? | `b-section-nest` |
| 11 | No context, `data-*` mark or `:has()` changes a component's form. Every `createContext` is in the closed list as `data`, `behaviour` or `portal`; a context that changes a child's form is not allowed (`HoldsContext` in plugin-api is identity that places flags, never a form, and both verifies sweep its file). The one exception: the Place's CSS hides the Panes before a covering Pane with `:has(~ [data-cover])`. | Does a descendant draw another tree, or another element, for a context it reads? Is every `dataset` in the closed list? | `b-context`, `b-dataset`; a CSS mark and `:has()` judged |
| 12 | A child writes nothing its parent reads after paint (a registration, a lend, a fill); the parent decides from its props. | Does an effect set state in, or a ref of, a component above it? | judged |
| 13 | A prop names what it chooses (`kind`, `form`, `fit`); none is called `type`. | Does a props type or a destructure carry `type`? | `b-type-prop` |
| 14 | A popup mounts in the body; only a showcase stage provides where. | Does a popup mount inside a frame that clips or scrolls? | `b-context` (the one `portal` context); judged otherwise |

## Waiting and figures

| # | Rule | Ask | Held by |
| --- | --- | --- | --- |
| 15 | The waiting form is the loaded form painted, never a second tree: it keeps the loaded form's marks, heights and text start, and typed text, focus and scroll survive the switch. | Does a twin file, a `*Wait` component or a branch draw the waiting form? Does a painted box differ from its loaded box? Does a Section's heading move when its data lands? | `b-wait` (no `wait.tsx`, `*-wait.tsx` or `*Wait`); the paint stories (a painted box equals its loaded box); the shift check of `stack screens test` (a Section heading's top, waiting against loaded); judged for the tree |
| 16 | Type is 12 px or more at every density, in at most six sizes a screen. | Is a text node under 12 px, or a seventh size on the screen? | render walk (type sizes) |
| 17 | Fonts are loaded before first paint, so no text reflows. | Does a text box change size when a face lands? | render walk (late fonts) |
| 18 | A bare number that changes in place sets tabular digits. | Is `font-variant-numeric` without `tabular-nums` on a figure that updates? | render walk (tabular digits) |
| 19 | A Section is a heading over its body, never a landmark; no region stands inside a region of its name. | Does a Section carry a name or a role that makes it a region? Do two landmarks share a name on the page? | render walk (same-name regions) |

## Acts

| # | Rule | Ask | Held by |
| --- | --- | --- | --- |
| 20 | An act holds its own run: `onAct` returns the promise of what it starts, and the pending look, the failure and the wait for a connection come from that promise, never from a flag the app passes in. | Does a prop or a context carry an act's `loading` or `busy` from above? Does an `onAct` start a mutation and return no promise? Does a host leave an act's rejection undrawn, or draw it where it moves the act? | the types (`ActBase` has no `loading`); `QueryProvider`'s dev checks, which fail a story on `returned no promise` and `nothing drew its failure`; judged for a host's line |

## Adding to a closed list

A new file in `b-measure` or `b-dataset`, or a new context, is the last resort. First try the
rule's own answer: flex, grid or a container query for a measure; a prop for a mark or a context.
An entry names the one thing the file reads and why CSS cannot; a context names its class, and
`form` is a named exception that records why no prop, no CSS and no parent that draws the child can decide it (the page for an unknown address, which the router mounts below a Shell or not).
