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
