---
id: 003-43
status: done
sessions: {}
---
# ui-core: a file row carries the mark of why it is listed

## Goal
Each file under the review's Sensitive changes says which category made it sensitive (tests, dependencies, CI, the check, size, knowledge text), and any file row its own change (added, removed, generated). Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`FileRow` takes `path`, `added`, `removed` and `seen` only. `ListRow` carries one `ChipMark` but not the path cut or the count lanes of a file. A `Section`'s description names the categories for the section as a whole. Stack 003-07 files a change mark for `ListRow`, `DefinitionRow`, `FormField` and `Table` rows, not `FileRow`.

Reference: Replit marks Modified and Added per file ([screen](https://mobbin.com/screens/0dae0a10-7c42-4e0e-8716-6f5fb0f1b54e)); Cursor marks New and Generated ([screen](https://mobbin.com/screens/fa7df34d-7288-4c26-a0e9-95a84921e34e)); Devin marks Added ([screen](https://mobbin.com/screens/1bee4b82-38f1-42a0-b500-aaf06efd2ea4)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Progress
Shape: `FileRow` takes one `chip?: ChipMark` and the List's `file` map a `chip` slot; the chip stands between the path and the counts, the path's cut measuring what is left, and a waiting row draws a chip bar when `chip` is declared (`fileShape`). Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live check (web per batch, phone on the harness).
