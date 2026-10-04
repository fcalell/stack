import type { FormIn } from "@fcalell/ui-core/variants";
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

// Set around an act that cannot run where it stands, with no reason to give:
// an `ActionBar`'s other acts while one act pends, a `MessageInput`'s Send
// while its text is empty and its desktop Stop without `onStop`. Each is inert and
// says so, drawn in its disabled form.
export const ActInert = createContext(false);

// Where a `Form` stands, which bounds its column: a sheet's body is the
// form's column; anywhere else the form stands on a page's, at most a line of
// running text wide.
export const FormStands = createContext<FormIn>("page");
