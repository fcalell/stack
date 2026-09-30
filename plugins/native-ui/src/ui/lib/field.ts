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
