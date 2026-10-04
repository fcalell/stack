---
id: 003-45
status: review
sessions: {}
---
# ui-core: a single choice among options with descriptions

## Goal
One answer among two to four options, each with a description line and the recommended mark, the chosen one holding a note field under it. The question sheet's options on every single-answer page, docked and modal. Stead needs it: `design/07-interface.md` at github.com/fcalell/stead, "Gaps", and the surfaces named here.

## Approach
`OptionList` is several choices: a `Checkbox` per row whose `onChange` toggles a set, read aloud as checkboxes. `SegmentedControl` takes two to four short segments with no description or recommended mark. `Picker` and `Select` draw an option's `description` line, but both hide the options behind a trigger, draw no recommended mark and hold nothing under the chosen option; `Picker` applies at once outside a form.

Reference: Customer.io's single-choice rows with a description each ([screen](https://mobbin.com/screens/42f37b19-0505-4d3d-b5fe-fbafce1a658c)); Claude iOS ([screen](https://mobbin.com/screens/2640dc90-cc24-4e23-a513-99ad8bde162e)); Perplexity ([screen](https://mobbin.com/screens/501351fa-f2ca-490a-93db-3bbda5d591a1)).

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Progress
Shape: OptionList's form is chosen by its value: `value: V | null` draws radio rows read as a radiogroup, a set draws checkboxes. TypeScript cannot narrow the props union by `value`, so OptionList has one call signature per form. New cells `OPTION_RADIO` and `OPTION_RADIO_DOT` from existing tokens (the dot at the `dot` size), for the design critique. No disabled radio look yet. Built on web and phone; `pnpm check` and `pnpm verify` pass. Open: the live check (web per batch, phone on the harness).
