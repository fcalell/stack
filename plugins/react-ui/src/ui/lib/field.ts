import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import { createContext } from "react";

// Whether the field around an act is disabled. Base UI's field context is
// internal and its Button reads none, so a field hands its state to the acts
// inside it through this one.
export const FieldDisabled = createContext(false);

// A toggle a row's label targets (a FormField's checkbox form, a list Picker
// row), handed to the Checkbox the row draws: it draws its box with no hit box
// of its own, so the box sits on the label's first line. A row that wraps the
// toggle in its label names it by its label line, so the row's other text (its
// mark) stays out of the name.
export interface LabelFit {
	labelledBy?: string;
}

/** What every control takes as a field: its name, and what a field draws around it. */
export interface Fielded {
	/** What it holds, the control's name (a short phrase; wraps). Placed alone the control draws as its field, this over it; where an owner names it (a `Form`'s field, a `Toolbar`), and at a bar fit that reads it in its box, it is the accessible name. */
	label: string;
	/** Under the control placed alone (a sentence; wraps). */
	description?: string;
	/** The value may be left empty: the word `optional` stands under the label. */
	optional?: boolean;
	/** The message that takes the description's place, the control drawn in error (a sentence; wraps): words, or runs of one sentence, so a machine name in it is a `{ code }` run boxed in the mono (`["No package at ", { code: "packages/lead-mail" }, "."]`). A save the server refused stands there on its own until the next change, a span of its message between backticks boxed the same (`markedRuns`). */
	error?: Run | Runs;
}

/** The keys a `FormField` supplies to the control it draws. */
export type FieldedKey = keyof Fielded;

// Set by an owner that names the controls standing in it (a `FormField`'s
// children, a `Toolbar`'s acts): a control there draws no field of its own,
// its `label` only its accessible name. Anywhere else a control placed alone
// draws its field (`FieldBody` with `alone`).
export const FieldOwned = createContext(false);

// Set by a `FormField` around a group of controls (a list Picker, a
// segments Picker): the id of its label, which names the group. No field
// context reaches the controls inside, so each keeps its own name.
export const GroupName = createContext<{ labelledBy: string } | undefined>(
	undefined,
);

// A `Table` cell's edit, handed to the control the cell draws: it stands in the
// cell at the field's bar fit, named by the cell (its column, then its row),
// out of the tab order (the grid's cursor reaches it); a number reads
// end-aligned in tabular figures, as the cell does. A control mounted with
// `starts` is the edit the keyboard or a tap started (the cell mounts it
// afresh): a typed one takes focus, a pick mounts with its list open. `done`
// hears the pick's list gone, its leave played, and `home` is the cell, where
// the closing list hands focus back.
export interface CellFit {
	label: string;
	starts: boolean;
	done: () => void;
	home: () => HTMLElement | undefined;
}

// An `Input` a row draws with no `FormField` around it (a list row's entry, a
// `Rules` term's typed value): it stands at the field's bar fit, named by
// `label`, and takes focus as it mounts when `focus` says the viewer's own act
// brought it.
export interface InlineFit {
	label: string;
	focus?: boolean;
}
