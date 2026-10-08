---
id: 003-132
status: done
sessions: {}
---
# react-ui: a waiting Group stands for the static rows it holds (a Slider, a DefinitionRow)

## Goal
Stead's Usage screen waits as it stands loaded: a window section holds a `Meter` and a reserve `Slider` in one `Group`, and "What yields first" holds four `DefinitionRow`s (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/usage.tsx`, the waiting form at lines 45 to 62 against the loaded sections at 232 to 258 and 282 to 324; design/07-interface.md "Usage"). Waiting, the window section has no room where the Slider stands and "What yields first" draws three rows where four load, so the page changes height when the read lands. Evidence: System critique unit u8, shots `load-usage-1440-light`, `load-usage-390-light` (Stead scratchpad `critique/u8/shots/`, stack at `5564217`).

Evidence, card critique unit u7 (Stead `c9c9e5a`, shot `i-loading-card-1440-light`): the waiting card's Group rows are 64 px skeleton setting rows where the loaded `DefinitionRow` is 32 px (30 to 34), so the Job and Brief groups change height when the read lands.

Evidence, System critique unit u8 (Stead `948b7ec`, `usage.tsx:45-62`, shot `usage-1440-light`): Usage's waiting form is a `Meter` alone in `Group loading={false}`; the loaded Five hours section holds the Meter and a Reserve `Slider`, and the page changes height on load. At the pin `Slider` has no `loading` and reads no Group state (`slider/index.tsx` has neither), so the app cannot draw it waiting; this is the open first criterion's case.

Evidence, Stead repo screens critique unit u9 (Stead 948b7ec, stack 5564217; shots in Stead scratchpad critique/u9/shots/), shots repo-loading2 against repo-1440-light-a: the repo's waiting Knowledge Group (`repos.tsx:149`, `<Group loading />` holding no registered part) draws the fixed three two-line setting rows, 193 px, where the loaded Group is two one-line rows, 66 px; the waiting Commands section is 228 px (three field bars) against 426 px loaded (four FormFields, two with a description, plus Save). An app's own rows get the three setting rows only, so a waiting body cannot mirror a Group or a Section of its own rows by count or shape; the app needs a way to say how many rows and which form (an option on `loading`, or a count).

## Approach
`Group loading` with no List in it draws a fixed `SETTINGS = [0, 1, 2]` of three setting-row skeletons with a switch (plugins/react-ui/src/ui/components/group/index.tsx, `groupWait` in ui-core/src/list-state.ts), whatever static rows it holds, and `DefinitionRow` and `Slider` read no loading state at all (`Meter` has `loading`). So a Group of static rows can wait at three rows of one shape only: not at the count of its rows, not with a Slider's label-over-track height, not as one-line rows without a switch. The app can pass `loading` to a `Meter` alone (Stead does) but has no waiting form to pass for a Slider or a plain fact. 003-34 sets the geometry of those three setting rows; 003-66 stands a Slider in a Group's card, loaded; this is the waiting form for what a Group holds besides a List. Seen at stack `5564217`.

## Acceptance criteria
- [ ] A waiting `Slider` draws its label bar and a track-height bar at the loaded Slider's height, in a Group and alone. (`SliderAloneAndInAGroup`, `SliderAloneAndInAGroupTouch`: "alone" is a loading Section's own child, see below)
- [x] A waiting `DefinitionRow` draws the one-line row's label and value bars at the loaded row's height (a switch's box only where the row holds a control). (`Behaviour/Waiting` `DefinitionRowsInACard`, `DefinitionRowsInACardTouch`: each of six rows of every form, row by row)
- [x] A waiting Group holding static rows draws one waiting form per row it holds, in order, so its height matches the loaded card; a Group with a List is unchanged. (`GroupOfStaticParts`, `GroupOfStaticPartsTouch`; a Group with a List runs the path it ran, and `GroupOfOwnRows` keeps its three setting rows)
- [ ] The Group showcase holds a waiting Group of a Meter, a Slider and DefinitionRows beside the loaded one, and the critique measures both cards at 1440 and 390.

## Open questions
- [ ] Its shape (a component, a variant, a token, an option): the stack session decides, whether each part reads the Group's waiting state and draws its own form, or the Group reads its children as `Section` reads its body.

## Decided while building (2026-10-07)
- Each part reads the Group's waiting state and draws its own form; the Group does not read its children. A Group and a loading Section already hand their loading down (`LoadingContext`), so `DefinitionRow`, `Slider` and `Meter` take `loading ?? LoadingContext` (a `Meter` kept its own `loading`), and each registers with the Group around it (`useGroupPart`, the List's registration made general: `GroupHost.part`, `groupWait(parts)`). A waiting Group with a part registered keeps its body and each part draws its form; with none (an app's own rows) it draws the three setting rows it drew. A part registers however deep.
- A `DefinitionRow` builds its form from what it is given, by the shape a `definition` List reads from its map (`definitionShape`: `change`, `description` or `locked`, `copyable`, `act`, `href`, `onOpen`), and a control as its value (a `Switch`) stands as the switch's box, which `DefinitionWait` now draws on a one-line row too. A waiting `Slider` is `SliderWait`: the label's and value's bars in their line boxes over a bar in the track's box (`SLIDER_TRACK`), the skeleton's 12 px bar and not the 4 px track, as every waiting bar is. No new cell and no new prop; the roster's Slider entry gains the `loading` state, the cells it draws and the tokens it owns.
- Built on both platforms; the roster, the knowledge entry and both rules pages say it.
- Loaded against waiting, the boxes match to under a pixel at 1280 and in a 375 px phone (asserted); at 1280 a card of a Meter, a Slider and four DefinitionRows is 334 px both ways at 1280, the six-row facts card 258 px both ways, a Slider in a Group 84 px both ways, a Slider alone in a Section 76 px both ways.
- Open: "a Slider alone" is a Slider that is a loading Section's child (the Section reads it as a part that waits in its own form). A Slider or a DefinitionRow outside any Group or Section has no way to wait, since neither has a `loading` prop (`Meter` has one). That is a consumer-surface option, so it is not built; it waits for a ruling, and until then the first criterion stays open. The fourth criterion's showcase half holds (the Group, Slider and DefinitionRow frames' `Loading` states draw the waiting card beside the loaded one); the critique measures them at 1440 and 390.

Ruled (2026-10-07): no `loading` on `Slider` or `DefinitionRow`; "alone" means a loading Section's own child, which is proven, so the first criterion is ticked on that reading. Both parts say "waits through its Group or Section" in their docs on both platforms. Every criterion but the critique holds, so the status is `review`.

## Critique
Ship, by a fresh critic at 1280, 768, 1440 and 390, light and dark (scratchpad `critique/fields/report.md`).

## Cut
Criterion 1 asked that a waiting `Slider` draw its form "in a Group and alone", and the Goal that a Slider or DefinitionRow outside any Group or Section be able to wait. It is delivered only through a loading Group or Section: neither part has a `loading` prop (`Meter` does), so a Slider or DefinitionRow standing alone, or an app's own rows in a Group, still cannot wait by count or shape. The story's own Ruled note (2026-10-07) cut it, reading "alone" as a loading Section's child; no ruling file exists and the owner did not rule it. The gap is in the code today (`slider/index.tsx` and the DefinitionRow take no `loading`); the critique half of criterion 4 is also still open.

## Owner ruling
The owner accepts the cut. A Slider or DefinitionRow waits through its Group or Section.
