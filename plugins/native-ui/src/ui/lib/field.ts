import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import { createContext, type RefObject, useContext, useEffect } from "react";
import type { TextInput } from "react-native";

// What every control takes as a field: its name, and what a field draws
// around it.
export interface Fielded {
	/** What it holds, the control's name (a short phrase; wraps). Placed alone the control draws as its field, this over it; where an owner names it (a `Form`'s field, a `Toolbar`), and at a bar fit that reads it in its box, it is the accessible name. */
	label: string;
	/** Under the control placed alone (a sentence; wraps). */
	description?: string;
	/** The value may be left empty: the word `optional` stands under the label. */
	optional?: boolean;
	/** The message that takes the description's place, the control drawn in error (a sentence; wraps): words, or runs of one sentence, so a machine name in it is a `{ code }` run in the mono (`["No package at ", { code: "packages/lead-mail" }, "."]`). A save the server refused stands there on its own until the next change, a span of its message between backticks set the same (`markedRuns`). */
	error?: Run | Runs;
}

// The keys a `FormField` supplies to the control it draws.
export type FieldedKey = keyof Fielded;

// Set by an owner that names the controls standing in it (a `FormField`'s
// children, a `Toolbar`'s acts): a control there draws no field of its own,
// its `label` only its accessible name. Anywhere else a control placed alone
// draws its field (`FieldBody` with `alone`).
export const FieldOwned = createContext(false);

// What names a typing control: the label of the `FormField` around it, else
// the title of the `Sheet` it sits in bare, since a sheet holding a bare field
// (the prose `Input` it grows full height for) is that field's editor. The
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

// Set around the field a sheet opens on (a confirm's typed name, a code): the
// control takes focus as it mounts.
export const FieldFocus = createContext(false);

// Set by a `FormField` around a group of controls (a list Picker, a
// segments Picker): its label, which names the group. No field context
// reaches the controls inside, so each keeps its own name.
export const GroupName = createContext<{ label: string } | undefined>(
	undefined,
);

// A `Table` cell's edit, handed to the control the cell draws: it stands in
// the cell at the field's bar fit, named by the cell (its column, then its
// row); a number reads end-aligned in tabular figures, as the cell does. The
// control mounts as the edit starts (a typed one focused, a pick with its sheet
// open) and `done` hears it end (the field left, the sheet closed).
export interface CellFit {
	label: string;
	done: () => void;
}

// An `Input` a row draws with no `FormField` around it (a list row's entry, a
// `Rules` term's typed value): it stands at the field's bar fit, named by
// `label`, and takes focus as it mounts when `focus` says the viewer's own act
// brought it.
export interface InlineFit {
	label: string;
	focus?: boolean;
}

// Set by a `Gate` or a docked `Sheet` around its body: the typing
// control of the region that holds focus, if any. An `Input` or code `Input` that
// mounts there takes focus unless one holds it, so the first field of a page
// or of a step that replaces the body takes it, and a second field beside it,
// or one revealed while another is typed in, never does.
export const FieldClaim = createContext<RefObject<TextInput | null> | null>(
	null,
);

// A typing control's claim on its region's focus: it takes focus as it
// mounts when none holds it, and holds it for as long as it is focused.
// `onFocus` and `onBlur` join the control's own handlers.
export function useFieldClaim(input: RefObject<TextInput | null>) {
	const column = useContext(FieldClaim);
	useEffect(() => {
		const control = input.current;
		if (!column || !control) return;
		if (!column.current) {
			column.current = control;
			control.focus();
		}
		return () => {
			if (column.current === control) column.current = null;
		};
	}, [column, input]);
	return {
		onFocus: () => {
			if (column) column.current = input.current;
		},
		onBlur: () => {
			if (column && column.current === input.current) column.current = null;
		},
	};
}
