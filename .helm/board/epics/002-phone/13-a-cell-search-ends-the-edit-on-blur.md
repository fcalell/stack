---
id: 002-13
status: backlog
sessions: {}
---
# native-ui: a cell's search ends the edit on blur

## Goal
A `Table` cell on the phone that edits through a picker with `search` used to end the edit when the search field lost focus. Since the cell's picker focuses its search (the form-by-context cleanup), blur no longer ends the edit, so a person who leaves the search without choosing keeps the cell open with no way back but the sheet's close.

## Approach
Pick where the end belongs: the cell's picker sheet closing (the sheet already returns focus), or the cell's own `onBlur` when focus leaves both the cell and its sheet. Keep the web cell as it is.

## Acceptance criteria
- [ ] On a phone, leaving a cell's search without choosing ends the edit and the cell returns to its resting form.
- [ ] Choosing an option still commits it and ends the edit once.
