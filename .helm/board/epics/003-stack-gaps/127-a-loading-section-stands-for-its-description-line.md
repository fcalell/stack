---
id: 003-127
status: review
sessions: {}
---
# react-ui: a loading Section stands for the description line it will have

## Goal
Stead's review screen waits as the loaded one stands, and its Check, Criteria and Sensitive changes Sections carry a description once loaded ("Passed on 6dbf0da", the criteria tally, "x of y" seen) (github.com/fcalell/stead, `packages/server/src/app/ui/review.tsx`, `Waiting` against the loaded Sections; design/07-interface.md "Items", a loading screen keeps its loaded height). Waiting, the Section draws no description line, so the Check Code block starts 22 px higher at 390 than it does loaded and the page shifts as the read lands. Evidence: item screens critique unit u4, shot `e-load-390-light` (Stead scratchpad `critique/u4/shots/`, stack at `5564217`).

## Approach
`Section`'s `description` is drawn as `<Text role="meta">` when it is set (plugins/react-ui/src/ui/components/section/index.tsx), whatever `loading` says; `loading` makes the count and the body wait and nothing else. The app does not know the sentence before the read lands, and passing a stand-in sentence ("Passed on 0000000") would draw invented text where a bar belongs and hold a real string in the accessibility tree. 003-34 (a Group's waiting rows) and 003-123 (a waiting Prose) set the same rule for those parts: a waiting form stands at the loaded geometry; `Section` has no such cell for its description. Seen at stack `5564217`.

## Acceptance criteria
- [x] A loading Section can stand for a description line: one meta-height line bar in the description's place, so the head keeps its loaded height. (`Behaviour/Waiting` `SectionDescriptionLine`, `SectionDescriptionLineTouch`)
- [x] A loading Section that asks for none is unchanged. (the same stories: a loading Section with no `description` keeps the head it had)
- [ ] The Section showcase holds a loading form with the description line beside the loaded one and the critique measures both heads.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides, whether `description` takes a waiting marker, a `loading` Section with a `description` draws the bar and keeps the text for the readers, or a separate prop.

## Decided while building (2026-10-07)
Not built: the shape is a consumer-surface choice, so it waits for a ruling. The part cannot derive that a description line stands, since the app does not know it before the read. Options: (a) `description=""` while the Section loads stands one meta-height bar and draws nothing loaded (an empty string draws no line today), so no prop changes, and an app writes `description={read?.tally ?? ""}`; (b) `description` also takes `true`, a marker the type carries for the waiting case; (c) a separate prop. Recommended: (a), the way a List reads the slots its map declares and a waiting form stands for them; its cost is that the convention is implicit, so the Section's `description` doc and the rules page say it. The Section's waiting form keeps the real text out of the accessibility tree because it draws a bar and no string.

Ruled and built (2026-10-07): `description=""` on a loading Section stands one meta-height bar (a line box at the meta role, half the measure, `aria-hidden`, so no string reaches the accessibility tree). Loaded, `""` draws no line, as today. An undefined `description` draws nothing in either state, so `""` and `undefined` differ only while loading. A non-empty `description` draws its text as before. No prop or type changes (`description?: string`); the convention is documented on both platforms' Section `description`, in the roster note, in `ui-core.md` and in both `rules.md` pages (`description={read?.tally ?? ""}` keeps the head's height). The Section frame's `Loading` state holds a described head waiting beside the loaded one; the critique measures them. Proven at 1280 and in a 375 px phone: the waiting head equals the loaded head, and a loading Section with no description matches its loaded self.
