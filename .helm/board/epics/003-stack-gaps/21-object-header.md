---
id: 003-21
status: backlog
sessions: {}
---
# ui-core: a form opens on a read-only object header

## Goal
Martechthings' portal request form opens from an object: its glyph, name and where it lives stand as read-only rows above every question, with a chevron to change it. No part draws a read-only object block on a form, distinct from an input.

## Approach
- References: Shell's report form, the station's name, address and ID as header rows ([screen](https://mobbin.com/screens/92de5008-73a5-4de0-9534-b0809e004a1c)); Supabase's support form echoing the picked project's ID ([screen](https://mobbin.com/screens/44cc0c14-b1cf-49b0-88e6-907f160ed927)).

## Acceptance criteria
- [ ] A form draws an object as read-only rows at its head, with one act to change it, at phone width.

## Open questions
- [ ] Whether `DefinitionRow`s in a `Group` already compose it: the stack session decides.
