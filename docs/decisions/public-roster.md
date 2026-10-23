# A component is public when a consumer places it

The roster's public components are the ones a consumer writes into a screen tree: a frame
(`Shell`, `Pane`, `Gate`, `Sheet`), a `Section`, a `Table`, a `Form`, a control, a figure, a
picture, a text. Everything the owner draws from data is a descriptor the owner takes, not a
component: a row, a mark (status, chip, avatar, icon, count), an act (button, icon act, menu entry,
link), a field, a message, a step count. The package exports the public components by name, never
a wildcard, and the showcase, the guides and `DESIGN.md` describe the public ones; a part has no
roster entry of its own, its states are its owner's.

**Why.** A consumer building a screen decides which component to reach for at every node; each
public component is a decision, with its props and its paragraph in the rules. Measured on two
consumers: 14 of 61 roster components were imported by neither, and the parts a consumer did
place (a `ListRow` in a `List`'s row map, a `DefinitionRow` in a `Group` item, a `Card` around a
`Prose`) existed because the owner's data shape stopped short of the part. Drawing the part from
data removes the decision and the duplicated public type on each platform.

**Trade-off.** A consumer cannot place a part on its own (a `Status` beside running text, a
`ListRow` outside a `Section`); it names the part in the owner's data instead, and a part with no
owner is a gap to file, never a new public component. A part's states are verified through its
owner's stories.
