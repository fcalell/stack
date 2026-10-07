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

// Where a `Form` stands, which bounds its column: a sheet's body, or a
// `Gate`'s column, is the form's column; anywhere else the form stands on a
// page's, at most a line of running text wide. An `ActionBar` in a `Gate`
// reads `auth` and stands across the column.
export const FormStands = createContext<FormIn>("page");

// A Form, or a FormField, holding a filling TextArea (which marks its box
// `data-fill`) takes the free height of the region the page gives it.
export const HOLDS_FILL = "has-data-fill:grow";

// A submit button's press runs the act itself, so the press ends the native
// submit it would start: a step the act swaps in leaves the form detached,
// and a submit still pending then logs "the form is not connected". Enter in a
// field presses the same button, so click and Enter share this one path.
export function endSubmit(
	submits: boolean,
	event: { preventDefault: () => void },
): void {
	if (submits) event.preventDefault();
}
