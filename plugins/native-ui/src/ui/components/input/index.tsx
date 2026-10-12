import type { IconAct } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed";
import { InputBase } from "./base";

export type InputKind =
	| "text"
	| "search"
	| "secret"
	| "source"
	| "number"
	| "email";

export interface InputProps extends Closed {
	kind?: InputKind;
	/** The value (text; one line, scrolls in the field). */
	value: string;
	onChange: (value: string) => void;
	onCommit?: (value: string) => void;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; truncates). */
	placeholder?: string;
	/** A `number`'s unit, drawn after the value (a word; one line). */
	unit?: string;
	act?: IconAct;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

// One line of typing in the field box: `edge-error` when its `FormField` is
// in error, the disabled fill when its field is disabled. `search` stands at
// the control's height behind its glyph; `number` opens the numeric keyboard
// and draws `unit` after the value; `source` is text a machine reads (a
// command, a path, a host), mono and never corrected or capitalized; `email`
// opens the email keyboard, offers the address the system knows and is never
// corrected or capitalized; `act` is an icon act inside the field's end, which
// the keyboard's return presses.
// In a `Gate` it takes focus as it mounts unless a typing control there
// holds it.
// `onCommit` hears the value once the viewer is done with it: on leaving the
// field or on the keyboard's return, only when it changed since the field took
// focus; with it, a hardware Escape puts back the value at focus and leaves
// the field. In a `Table` cell it stands at the bar fit, named by the cell,
// focused as the edit starts, a number end-aligned in tabular figures as the
// cell reads. In a `ListRow`'s entry or a `Rules` term it stands at the bar
// fit, named by its label.
export function Input({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
	autoFocus,
}: InputProps) {
	return (
		<InputBase
			kind={kind}
			value={value}
			onChange={onChange}
			onCommit={onCommit}
			placeholder={placeholder}
			unit={unit}
			act={act}
			autoFocus={autoFocus}
		/>
	);
}
