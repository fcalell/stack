---
id: 003-10
status: backlog
sessions: {}
---
# ui-core: a row shows a labelled act, and holds an input with its act

## Goal
Martechthings' implementation items carry the next claim ("Claim staging") on the item, and onboarding import rows carry a URL input with its Import act on the row, which then turns into its result. `ListRow` puts every act in its more menu; `DefinitionRow` takes one icon act.

## Approach
- References: Stripe's Connect setup rows with a visible trailing button that turns to "Edit" when done ([screen](https://mobbin.com/screens/032c6d85-93ec-4828-9fe4-8a86a631d654)); Plain's knowledge sources, an inline URL input with its add act per kind ([screen](https://mobbin.com/screens/55a23b0b-bc0b-4ced-aaf4-f23f14f69626)); Apollo's setup rows whose trailing act names the row's state ([screen](https://mobbin.com/screens/54e2f7be-0e03-4874-9790-6e7bda548de1)).

## Acceptance criteria
- [ ] A row draws one visible labelled act at its end.
- [ ] A row holds an input and its act inline, and can swap them for its result.

## Open questions
- [x] A `ListRow` variant, or a `Form` inside a `Group` row: the stack session decides.

## Shape
`ListRow.act?: Act`: one labelled `Button` `secondary` at the `bar` fit at the row's end, ahead of the more act. `ListRow.entry?: RowEntry`, `RowEntry = { label: string; field: FieldControl<string>; placeholder?: string; act: Act; error?: string }`: a bar-fit `Input` under the title in the meta line's place, everywhere, with a labelled `Button` for its act and the error in the meta line's place. The consumer swaps `entry` for `meta`/`status` once the act settles, so the row keeps no state. `RowSlots` gains `act` and `entry`, with waiting shapes in `list-state.ts`.
