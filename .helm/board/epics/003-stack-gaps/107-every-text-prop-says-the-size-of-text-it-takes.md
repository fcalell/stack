---
id: 003-107
status: review
sessions: {}
---
# react-ui: every text prop says the size of text it takes

## Goal
A prop's JSDoc names whether it takes a word, a short phrase or a sentence, and what the component does past it (truncates, wraps). Stead hit it in `packages/server/src/app/ui/item-screen.tsx`: a sentence passed as `Status`'s `label` (documented "The word…", but nothing types or flags it), and a sentence passed as `DefinitionRow`'s `value` (documented "The fact: words, a status, or a control"; nothing says the value takes half the row and truncates). Both rendered cut or crowded and passed the app's own checks.

`Form`'s doc (form/index.tsx: "The fields, or the `Section`s that hold them") also allows a Form holding a Section. A page mixing one Form-held Section among bare Sections puts that Section at the form rhythm (gap-fields) and its siblings at gap-pair, so heading-to-body gaps differ within one screen. The doc does not say which shape a page with one form among sections takes.

## Approach
Nothing in the roster states a text prop's size: each doc phrases it its own way ("The word", "The fact", "words"), so an app cannot tell a word slot from a sentence slot, and the component cuts silently. Related but distinct: story 104 (a status label's measure) and story 100 (DefinitionRow end slots). For Form, the app cannot restructure around the doc without choosing a rhythm the doc never names.

## Acceptance criteria
- [x] A fixed vocabulary (a word, a short phrase, a sentence) names the size of text for text props across the roster.
- [x] Every string prop's JSDoc uses it and says what the component does past the size (truncates, wraps).
- [x] `rules.md` states the vocabulary.
- [x] `Form`'s doc says which shape a page with one form among sections takes, and heading-to-body gaps match across the page's sections.

## Open questions
- [x] Whether the size is documentation alone or also typed or flagged (a dev warning, a branded type): the stack session decides.

## Ruled
Docs only (rulings item 9): the size is documentation, not a branded type or a dev warning. The roster (`packages/ui-core/src/roster.ts`) carries prop names and no prop docs, so `DESIGN.md` is unchanged by regeneration.

## Built
Both `rules.md` pages carry "A text prop takes one of four sizes": a word (18 characters in a bounding slot, then truncates), a short phrase (the room its line leaves, then truncates or wraps), a sentence (wraps), text (wraps whole), what each does past its size, and that an identifier cuts in its middle. Every string prop's JSDoc in `plugins/react-ui/src/ui/components/*/index.tsx` and `plugins/native-ui/src/ui/components/*/index.tsx` ends in its size and what the component does past it, read from each component's draw, so the two platforms differ where they draw differently (a `Place` or `Screen` title wraps on the phone; a list row's trailing value stays whole on the phone and is whole or gone on the web). The list, thread and comparison slot mirrors carry the same text. Every string field of the shared descriptors (`Act`, `Option`, `StatusMark`, `ChipMark`, `Lock`, `RowLeading`, `RowEntry`, `Confirmation`, `Stage`, `Attachment`, `Hunk`, `DiffLine`, `TableCell` and the rest) carries it as `//` comments in `packages/ui-core/src/descriptors.ts`, since ui-core allows no JSDoc under `src` (check c24).
The `Form` question: both `rules.md` pages and both `Form` docs state that a `Form` holds fields, one form among sections is `Section > Form` so every section's head-to-body gap stays the pair step, and `Form > Section` is for a page whose every section is in the form (all at the fields step).
Evidence: `pnpm check` (45 of 45 turbo tasks), Biome clean over `apps packages plugins`, `ui-core verify` 34/34, `plugin-react-ui verify` 13/13, `plugin-native-ui verify` 19/19. No browser run: the change is comments and guide text.
