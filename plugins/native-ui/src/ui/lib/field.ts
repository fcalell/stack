import { createContext, useContext } from "react";

// What names a typing control: the label of the `FormField` around it, else
// the title of the `Sheet` it sits in bare, since a sheet holding a bare field
// (the `TextArea` it grows full height for) is that field's editor. The
// nearest wins, so a field in a sheet is named by its own label.
export const FieldNameContext = createContext<string | undefined>(undefined);

export function useFieldName(): string | undefined {
	return useContext(FieldNameContext);
}

// Whether the field around a control is disabled, the web's Base UI field
// state: a disabled control answers no press and draws its disabled cells.
export const FieldDisabled = createContext(false);

// Whether the `FormField` around a typing control is in error, so the
// control's box draws `edge-error`.
export const FieldError = createContext(false);

// Set by a `FormField` around its control: the control refuses a value into
// the field's error line (`refuse(reason)`) and clears it on the next pick
// (`refuse(undefined)`), so the line stays one place whoever speaks.
export const FieldRefusal = createContext<
	((reason: string | undefined) => void) | undefined
>(undefined);

// Set around the field a sheet opens on (a confirm's typed name, a code): the
// control takes focus as it mounts.
export const FieldFocus = createContext(false);

// Set by a row whose label is a toggle's target (a FormField's checkbox
// form, an OptionList row): the row takes the press and carries the
// toggle's role and state, and the checkbox inside draws its box alone, with
// no hit of its own, on the label's line.
export const LabelTarget = createContext(false);

// Set by a `FormField` around a group of controls (an OptionList, a
// SegmentedControl): its label and its description or error, which name and
// describe the group. No field context reaches the controls inside, so each
// keeps its own name.
export const GroupName = createContext<
	{ label: string; said?: string } | undefined
>(undefined);

// Set by a `Table` around a cell's edit: the control stands in the cell at the
// field's bar fit, named by the cell (its column, then its row); a number reads
// end-aligned in tabular figures, as the cell does. The control mounts as the
// edit starts (a typed one focused, a pick with its sheet open) and `done`
// hears it end (the field left, the sheet closed).
export const CellField = createContext<
	{ label: string; done: () => void } | undefined
>(undefined);

// Set by a `ListRow` around its entry: the input stands at the field's bar fit,
// named by the entry's label, since no `FormField` labels it.
export const EntryField = createContext<{ label: string } | undefined>(
	undefined,
);
