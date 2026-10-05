---
id: 003-22
status: backlog
sessions: {}
---
# ui-core: answered questions fold to summary rows

## Goal
Martechthings' portal request form is one scrolling page where a choice reveals the next question. Answered questions fold to a summary row (check, question, answer muted, edit act) so no Back act is needed. The onboarding pattern asks one question per step.

## Approach
- Reference: Google Photos' steps, answered ones collapsed with a check and a pencil ([screen](https://mobbin.com/screens/95aaaa65-9f65-4dac-b105-53e1ebb1c096)).

## Acceptance criteria
- [ ] An answered question folds to a summary row that reopens it, inside a single-page form.

## Shape
`FormField.answered?: { answer: string; onEdit: () => void }`: while set the field draws folded as one summary row (a `Check` in `ok`, the label, the answer in `ink-meta`, a trailing `Pencil` `IconButton` named by the word `edit`) and does not render its control. Clearing `answered` unfolds the field and focuses its control. A choice revealing the next question is the consumer's rendering inside one `Form`.
