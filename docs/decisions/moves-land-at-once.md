# Moves land at once

A navigation, a read's first answer (the painted form giving way to the loaded one), a block the
viewer adds or removes (a row, a chip, a fold, a docked sheet) and a segmented control's ground all
land at once. No view transition runs on the web and no `LayoutAnimation` on the phone. What still
moves: a state's look (`answer`), a press (`give`), a layer entering and leaving, a line and a block
that arrive on their own (`LINE_IN`, `BLOCK_IN`), a measured value, a wait, a follow and a stream.

**Why.** A view transition snapshots the whole document and blocks input until it finishes.
Measured on a consumer: every click on a tab or a row ran a `startViewTransition` of 236–328 ms
with 36 named elements, so the page was frozen for that long on each act. The anchor apps (Linear,
Notion, Vercel) animate none of these; a route change and a list change are instant there.

**Trade-off.** The painted form is the loaded one's geometry, so the switch itself draws nothing
to explain; a block the viewer removes closes up with no fade. That is accepted over the latency.
