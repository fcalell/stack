---
id: 003-208
status: review
sessions: {}
---
# react-ui: a row's status words take a short form when the meta line is out of room

## Goal
Stead's Repos list rows read title, then a meta line of the remote, "· main" and the status "Fetched 3 minutes ago" (github.com/fcalell/stead, `packages/server/src/app/routes/system/-components/repos.tsx`, the `List` row at lines 94-95: `meta: [r.remote, r.defaultBranch]`, `status: fetchStatus(...)`; design/07-interface.md "Repos"). The status words are 122 px; they stand in 66 px at 1440 in the three-pane layout, 53 px at 390 and 35 px at 320, so a row reads "/tmp/fx9/remotes/sailw… · Fetched 1…", "Fetched 5 mi…", with "· main" gone and the remote cut as well. What is left of the status, "Fetched 1…", no longer says when. Evidence: Stead Repos critique unit u9 (stack `74a0e3d`, HEAD checked: `git log 74a0e3d..HEAD` holds no change to list-row or status), shots `list-390-light.png` and `repo-1440-light.png` in the Stead scratchpad `critique/u9/shots/`.

## Approach
Not a repeat of 003-118: that story asked the status to yield before the subject is cut, and was ruled closed because the status shares the overflow with the first part (003-104) and an app that needs a subject whole puts it first or moves the status's words. Here the app already gives the subject as the first part and the status in its own mark, and the shared overflow does what 003-104 built: both are cut, the status to a fragment. The part left unprovided is a status that can say less instead of being clipped. `Status` takes one `label` and truncates it (list-row/index.tsx `STATUS_MARK`, status/index.tsx); the app can pass a shorter word ("5 min ago") only for every width, since it does not know the line's room. 003-83 (and 047e0d1f) gave the trailing age a short form the row words itself, and the meta line's status of an age ("Fetched 5 minutes ago") has none. Moving the words elsewhere is not available either: they are the row's status, drawn with its dot.

## Acceptance criteria
- [ ] A row whose status words can be said shorter draws the short words when the meta line is out of room for the long ones, so a status is never left as a clipped fragment of its first word, on both platforms.
- [x] A row with room, and a status with no short form, are unchanged.
- [ ] The ListRow showcase holds a status with a short form on a line too narrow for it, at 320, 390 and the 440 px list column, measured by the critique.

## Open questions
- [x] Its shape (a `short` label on the status mark, a moment the row words itself as the trailing age does, or a floor in characters under which the status yields to the first part): the stack session decides.

## Ruled
`StatusMark.short?: string` (ui-core `descriptors.ts`), the words said shorter, drawn in `label`'s place on a `ListRow`'s meta line while the long form would be cut. Stack cannot reword an app's sentence, and a floor in characters still leaves a fragment, so the app offers the words. `label` stays the name; only `ListRow` reads `short`.

## Built
- ui-core `list-state.ts`: `shortHeld(held, width, cut)`, the rule that keeps the two forms from flipping: the decision rests on the meta line's width alone, never on the form drawn. The width at which the long form was cut is held and the short form drawn while the line is no wider; wider, the long form draws again and is measured. A new `label` or `short` clears it. Tested in `list-state.test.ts`.
- react-ui: `lib/short.ts` (`useShort`): the long form is the first paint; a layout effect reads the label's `scrollWidth` against its `clientWidth` before paint, and a `ResizeObserver` on the meta line re-reads. `list-row/status.tsx` draws the `StatusBase` with `short` (the visible short form `aria-hidden`, the long label `sr-only` so the name stays). The short form takes `shrink-0`: the app offered it to read whole, so the first part takes the overflow (a short form sharing the overflow in proportion was still cut at 320 touch).
- native-ui: `lib/short.ts` (`useShort`) and `list-row/status.tsx`: the meta line's `onLayout` width, and an invisible twin `Text` at the visible word's width whose `onTextLayout` reports lines past one where the visible word truncates (a truncated line's report differs between platforms); the status carries `accessibilityLabel` of the long label while the short one draws.
- Both `rules.md`, the roster ListRow note and `ui-core.md` describe it.
- Showcase: `behaviour/list-row-status.stories.tsx` (`StatusShort`, `StatusShortResizes`, `StatusLong` and touch twins): at 440, 390 and 320 the drawn words are whole (the long form where it fits, `5 min ago` at 320, the long label still in the tree), a line resized through 440, 400, 360, 330 and back draws one form per width, a row with room and a status with no short form keep the long words (cut as before where they do not fit). Scoped stories run: the `list-row`, `row-meta`, `status`, `list.stories` and `table` files, all passed.
- The phone's measure is unchecked on a device (the twin is the fallback the ruling names); the native verify suite and type-check pass.
Native unrendered: short status on a narrow line, on both platforms.
