# Rows are data

A collection takes its rows as data: `items` is a `Datum<readonly Row[]>`, each `Row` the
descriptor its drawer takes (`RowItem`, `FileItem`), built by the consumer from its records
(`read.at((rows) => rows.map(toRow))`). `Section` is the one collection: with `items` it draws the
sheet of rows (titled when it has a `title`, bare when not), with `children` it frames parts. There
is no `List`, `Group`, row slot map (`row={{ key: (item) => …, title: (item) => … }}`), nor public
`ListRow`, `DefinitionRow` or `FileRow`. The row types live once, in ui-core, and both platforms
draw them.

A fact and a thing are one `RowItem`: a row draws whichever slots it fills on one box. A `label`
puts it in the sheet's aligned label column (a fact: `{ label, title }`); without one its text
starts at the row's start (a thing: `{ title, meta }`). There is no second descriptor for a
definition, and no renderer that draws one differently: a row truncates its title unless it has `wrap`, whatever it holds.

**Why.** The slot map existed for three things: rows as data rather than mapped JSX, windowing by
index, and painted rows shaped by the slots given before any item arrives. Data gives the first
two directly, and the third is one default form. The map cost a union of slot functions with
exclusivity (`?: never`) per kind, a `useRow` per row, a public slot type duplicated verbatim per
platform, and it leaked: definition rows did not fit it, so consumers built `{ key, row:
<DefinitionRow/> }` elements at 68 sites. In the consumer, 92 maps averaging 17.5 lines each
carried 65 `(item) =>` prefixes that a `toRow` function does not. Two row descriptors that differed
by a dozen fields cost the same again: two renderers drifting in height, ink and lock, and a
dispatch on `"label" in row`.

**Trade-off.** A waiting collection paints one form (a title line over a meta line, `PAINT_ROWS`
tall), not the shape of the rows to come; a collection whose painted form must differ is the
trigger for a `paint` hint, not built ahead. A row's parts that are their own reads stay `Datum`
fields on the row, so the row frame is unchanged; what is lost is the per-list painted shape.
