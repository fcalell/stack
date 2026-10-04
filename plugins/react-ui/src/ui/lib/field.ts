import { createContext } from "react";

// Whether the field around an act is disabled. Base UI's field context is
// internal and its Button reads none, so a field hands its state to the acts
// inside it through this one.
export const FieldDisabled = createContext(false);

// Set by a row whose label is a toggle's target (a FormField's checkbox
// form, an OptionList row): the toggle inside draws its box with no hit box of
// its own, so the box sits on the label's first line. A
// row that wraps the toggle in its label names it by its label line and
// describes it by its description line, so the row's other text (its mark)
// stays out of the name.
export const LabelTarget = createContext<
	{ labelledBy?: string; describedBy?: string } | undefined
>(undefined);

// Set by a `FormField` around a group of controls (an OptionList, a
// SegmentedControl): the ids of its label and of its description or error,
// which name and describe the group. No field context reaches the controls
// inside, so each keeps its own name.
export const GroupName = createContext<
	{ labelledBy: string; describedBy?: string } | undefined
>(undefined);

// Set by a `Table` around a cell's edit: the control stands in the cell at the
// field's bar fit, named by the cell (its column, then its row), out of the
// tab order (the grid's cursor reaches it); a number reads end-aligned in
// tabular figures, as the cell does. A control mounted with `starts` is the
// edit the keyboard or a tap started (the cell mounts it afresh): a typed one
// takes focus, a pick mounts with its list open. `done` hears the pick's list
// close, and `home` is the cell, where the closing list hands focus back.
export const CellField = createContext<
	| {
			label: string;
			starts: boolean;
			done: () => void;
			home: () => HTMLElement | undefined;
	  }
	| undefined
>(undefined);
