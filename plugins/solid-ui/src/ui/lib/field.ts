import { createContext, useContext } from "solid-js";

// What a `FormField` tells the typing control inside it: the id its label
// points at, and whether the field carries an error.
export interface FieldContextValue {
	id: string;
	invalid: () => boolean;
}

export const FieldContext = createContext<FieldContextValue>();

export function useField(): FieldContextValue | undefined {
	return useContext(FieldContext);
}

// What a `Sheet` names a typing control by when no `FormField` around it
// does: the id of the sheet's title, since a sheet holding a bare field (the
// `TextArea` it grows full height for) is that field's editor, and its title
// is the field's name.
export const SheetTitleContext = createContext<string>();

// The id of the element that names a bare typing control: the sheet's title
// outside a `FormField`, none inside one, whose label names it through `for`.
export function useFieldName(): string | undefined {
	const title = useContext(SheetTitleContext);
	return useField() ? undefined : title;
}
