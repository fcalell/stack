import { createContext } from "react";

// What a `Form` hands the `ActionBar` inside it: the call that marks the form
// busy while the bar's filled act pends. Its presence is what puts a
// `Section` on the fields rhythm.
export const FormContext = createContext<
	((pending: boolean) => void) | undefined
>(undefined);

// Set by an `ActionBar` inside a `Form` around its filled act: the `Button`
// it draws is the form's submit button, so Enter in a field presses it.
export const SubmitContext = createContext(false);
