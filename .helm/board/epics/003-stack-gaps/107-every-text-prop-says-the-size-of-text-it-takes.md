---
id: 003-107
status: backlog
sessions: {}
---
# react-ui: every text prop says the size of text it takes

## Goal
A prop's JSDoc names whether it takes a word, a short phrase or a sentence, and what the component does past it (truncates, wraps). Stead hit it in `packages/server/src/app/ui/item-screen.tsx`: a sentence passed as `Status`'s `label` (documented "The word…", but nothing types or flags it), and a sentence passed as `DefinitionRow`'s `value` (documented "The fact: words, a status, or a control"; nothing says the value takes half the row and truncates). Both rendered cut or crowded and passed the app's own checks.

`Form`'s doc (form/index.tsx: "The fields, or the `Section`s that hold them") also allows a Form holding a Section. A page mixing one Form-held Section among bare Sections puts that Section at the form rhythm (gap-fields) and its siblings at gap-pair, so heading-to-body gaps differ within one screen. The doc does not say which shape a page with one form among sections takes.

## Approach
Nothing in the roster states a text prop's size: each doc phrases it its own way ("The word", "The fact", "words"), so an app cannot tell a word slot from a sentence slot, and the component cuts silently. Related but distinct: story 104 (a status label's measure) and story 100 (DefinitionRow end slots). For Form, the app cannot restructure around the doc without choosing a rhythm the doc never names.

## Acceptance criteria
- [ ] A fixed vocabulary (a word, a short phrase, a sentence) names the size of text for text props across the roster.
- [ ] Every string prop's JSDoc uses it and says what the component does past the size (truncates, wraps).
- [ ] `rules.md` states the vocabulary.
- [ ] `Form`'s doc says which shape a page with one form among sections takes, and heading-to-body gaps match across the page's sections.

## Open questions
- [ ] Whether the size is documentation alone or also typed or flagged (a dev warning, a branded type): the stack session decides.
