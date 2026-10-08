---
id: 003-131
status: done
sessions: {}
---
# react-ui: a loading Section with a Prose or Thread body stands for that body, not for form fields

## Goal
Stead's story card waits as it stands loaded: a Brief section holding a `Prose`, a Thread section holding a `Thread`, each in a `Section loading` with the part's own `loading` set (github.com/fcalell/stead, `packages/server/src/app/routes/work/-components/card.tsx`, `CardWaiting`; design/07-interface.md "The card", a loading screen keeps its loaded height). Waiting, the Brief section is 345 px at 1280 where the loaded Brief is about 150 px, and the Thread section draws the same three label-and-block groups where messages will stand, so the card changes height and shape when the read lands. Evidence: card critique unit u7, shots `load-card-1280-light`, `load-job-1280-light`, `run-1280-light` (Stead scratchpad `critique/u7/shots/`, stack at `5564217`).

Evidence, item screens critique unit u4 (main 54deb15, `ui/review.tsx:131` `<Code text="" tail={5} loading />`, shot `loading-review-390-light`): the waiting Check card is 188 px at 390 and 140 px at 1280 against 231 and about 179 loaded, a 43 and 39 px jump, because the loaded Code carries a "Show 3 earlier lines" row (44 px touch, 24 px desktop) the waiting card lacks; the Sections below move with it.

Re-measured, card critique unit u7 at Stead `c9c9e5a` (shot `i-loading-card-1440-light`): at 1440 the waiting refining card scrolls to 1092 px against under 754 loaded and the waiting running card to 898 px; the waiting Prose is three 52 px blocks where the loaded one is two text lines, and the loaded Section's act (Write the brief now) has no waiting slot.

Evidence, System critique unit u8 (Stead `948b7ec`, `status.tsx:19-29`, shot `s6-loading-status`): Status waits as three sections of three DefinitionRows each; loaded they are 4, 1 and 1 rows (Backup an EmptyState), so the page jumps 260 px on load. A section's waiting body stands for a count of rows it cannot know.

## Approach
A loading `Section` decides how its body waits from the direct children it knows (`sectionPartsOf` with `KINDS` in plugins/react-ui/src/ui/components/section/index.tsx: List, Table, BarChart, Comparison, QueryBoundary, Group, FormField). A body holding none of them counts as a body of fields: `sectionState` (ui-core/src/list-state.ts) returns `parts.fields || FALLBACK_FIELDS`, so the Section draws three skeleton fields (a label bar over a 59 px block) and hides the real body (`BODY_WAITS = "hidden"`), whatever its children's own `loading` would draw. `Prose` and `Thread` have their own waiting forms (`Prose loading`, `Thread loading`), but they never show inside a loading Section, and the app cannot reach the Section's choice from outside. Not 003-123 (how many lines a waiting `Prose` stands for): that one is the part's own form, which this Section hides. Not 003-127 (the description line). Seen at stack `5564217`.

## Acceptance criteria
- [ ] A loading Section whose body is a `Prose`, a `Thread` or a `Code` draws that part's own waiting form, not skeleton fields.
- [x] A loading Section holding fields, a Group or a List is unchanged. (`SectionOverFields`, the `sectionState` unit tests, the Section `Loading` state story)
- [ ] The Section showcase holds a loading Section over a Prose and one over a Thread beside the loaded ones, and the critique measures both heights.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether the Section reads more kinds as waiting parts, shows its body whenever a child declares its own `loading`, or takes the fallback only for a body that holds no part with a waiting form.

## Decided while building (2026-10-07)
- The Section reads more kinds: the platform walker's `forms` (a `Prose`, a `Thread`, a `Code`, a `Meter`, a `Slider`) beside its lists, waiters, Group and fields, counted in `SectionParts.forms`. `sectionState` returns no skeleton fields when the body holds one of them and no `FormField`; a field beside one keeps the skeleton fields, and a body of lists, a Group or fields is as it was. No prop, no cell.
- The parts read the Section's loading: `Prose`, `Code`, `Thread` (through its list state's `sectionLoading`) and `Meter` take `loading ?? LoadingContext`, as a Group and a List do, so the app sets nothing on the part and an explicit `loading={false}` still shows it. A loaded `Prose` resets that loading for its fenced `Code` blocks, which wait only as the text does.
- Built on both platforms; the roster, `.helm/knowledge/architecture/ui-core.md` and both rules pages say it.
- Not covered: a waiting `Prose` is still its two paragraphs, so a Section over a one-line text changes height on load (003-123); a Thread's waiting form is its three messages. The Code Section holds its loaded height at both densities (the fold's row and `tail` lines); the Prose and Thread Sections do not, by the count of lines and messages the data has.
- Proven in `apps/showcase/behaviour/waiting.stories.tsx` under the browser lock: the waiting Prose is visible with no text, the Thread draws its three waiting messages, the Code Section's height equals the loaded Section's, at 1280 and in a 375 px phone. The third criterion's showcase half holds (the Section frame's `Loading` state draws a Notes, a Thread and a Check Section waiting beside the loaded ones); the critique measures them.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/section/report.md`).
