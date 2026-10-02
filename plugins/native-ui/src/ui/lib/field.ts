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

// Set around the field a sheet opens on (a confirm's typed name): the
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
