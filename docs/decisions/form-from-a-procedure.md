# A form is derived from its procedure

A `Form` takes the procedure it submits (`act={orpc.requests.submit}`), the fields it shows as
`{ key: { label, description? } }` keyed by the procedure's input keys, and `given`, the input keys
the screen supplies (a scope id, a record id). From the procedure's input schema it derives each
field's control (string to `Input`, a date string to `Input kind="date"`, enum to `Picker`, boolean to
`Switch`, number to a numeric `Input`, a list of an enum, or of strings with `options`, to a `Picker` of several), its optionality (an optional field says so under its label), its options, the issue line a failed validation puts under it, the
pending and done states, and the reset. The client has no runtime schema of its own, so
plugin-api's `postWrite` emits each procedure's input schema as data, with its kind and its scope key, in
`.stack/schema.ts`; the scope key comes from the route's boundary, so the form never asks for it. A
`can` of `[action, subject]` gates the form on the caller's ability in that organization, and a
`Sheet`'s `form` takes the same props, so a task over a procedure is one shape wherever it stands. A form
that takes `commit: "field"` draws no bar and sends each field on its own commit (the given keys
plus the field's), so a settings page is the same shape. `acts` stand in the bar before the filled submit (a Cancel, a destructive Decline), and `onDone` hears the output and the input sent.

**Why.** Measured on one consumer: 148 of 179 form fields were a procedure's own `z.object` input
key, with the type, optionality and enum values already declared on the worker; the screen held
one `useState` per field, built the input by hand, derived `blocked` and called `mutateAsync`.
The schema is the one truth the product already writes; a second declaration per field is the
part that drifts.

**Trade-off.** A field the schema cannot describe (a file, a long text that needs a prose
control, a pick whose options are a read) takes a `control` hint on its field entry; a form
over no procedure (a filter, a local setting) is not a `Form`. The generated schema file is
one more generated artefact under `stack generate`, a `Gate` step over local state draws its
controls directly, and a procedure whose input is not a
`z.object` cannot back a form. A file field reads the picked file into the string at submit (its name into the sibling key its `name` gives), so
nothing of the file is held in the schema but its `contentEncoding`; its `accept` has no JSON Schema
form and the field says it. A pick's `options` may be a function of the draft, which narrows them by the
fields before it and clears a chosen value that no longer stands.
