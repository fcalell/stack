---
id: 003-55
status: done
sessions: {}
---
# ui-core: a row whose title wraps in full

## Goal
A memory note reads whole in its list with its origin on the meta line and its more menu. System, Memory, the notes under each owner. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`ListRow` cuts its title to one line, and a `Quoted` title wraps to two but adds typographic quotes, which mark model-written names, never an approved note. `Prose` is one document with no per-item meta line or more menu. `Message` is a conversation turn, its author and bubble the wrong meaning.

Reference: Oura's notes wrap whole with their date ([screen](https://mobbin.com/screens/f5728230-f84a-40ac-aa8e-48b9238e1ae5)); Perplexity's memories ([screen](https://mobbin.com/screens/9da0306d-58e7-4c44-aa67-1537d44b2e7e)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Shape
`ListRow.wrap?: boolean` (and `RowSlots.wrap`): the title wraps to every line it needs at body weight 400 (a `ROW.lines.whole` cell), the leading, trailing and more act aligned to its first line; meta unchanged. The waiting row draws the one-line form (one body line in the title's place), as the rubric's skeleton constant says: a loaded row whose text wraps grows by its wrapped lines, its waiting row matching its one-line form.

Review (accepted by fcalell): a one-line wrapped row on touch stands 40 tall, not a row's 48: `ROW.lines.whole` has no min height.
