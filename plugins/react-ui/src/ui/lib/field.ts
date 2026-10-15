import { createContext } from "react";

// Whether the field around an act is disabled. Base UI's field context is
// internal and its Button reads none, so a field hands its state to the acts
// inside it through this one.
export const FieldDisabled = createContext(false);

// A toggle a row's label targets (a FormField's checkbox form, an OptionList
// row), handed to the Checkbox the row draws: it draws its box with no hit box
// of its own, so the box sits on the label's first line. A row that wraps the
// toggle in its label names it by its label line, so the row's other text (its
// mark) stays out of the name.
export interface LabelFit {
	labelledBy?: string;
}

// Set by a `FormField` around a group of controls (an OptionList, a
// SegmentedControl): the id of its label, which names the group. No field
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

// An `Input` a row draws with no `FormField` around it (a `ListRow`'s entry, a
// `Rules` term's typed value): it stands at the field's bar fit, named by
// `label`, and takes focus as it mounts when `focus` says the viewer's own act
// brought it.
export interface InlineFit {
	label: string;
	focus?: boolean;
}
