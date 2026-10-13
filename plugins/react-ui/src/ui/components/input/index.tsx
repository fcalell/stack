import type { IconAct } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed.ts";
import { InputBase } from "./base.tsx";

export type InputKind =
	| "text"
	| "search"
	| "secret"
	| "source"
	| "number"
	| "email";

/** One line of typing, the control a `FormField` labels, describes and marks in error. */
export interface InputProps extends Closed {
	/** What is typed: `text` (the default), `search` (a toolbar box with its glyph), `secret`, `source` (mono, a machine reads it), `number` (with `unit`), or `email`. */
	kind?: InputKind;
	/** The value (text; one line, scrolls in the field). */
	value: string;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** Hears the value once the viewer is done with it: on leaving the field or on Enter, only when it changed since focus; Escape then puts back the value at focus and leaves the field. */
	onCommit?: (value: string) => void;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; truncates). */
	placeholder?: string;
	/** A `number`'s unit, drawn after the value (a word; truncates past the short measure, 18 characters). */
	unit?: string;
	/** An icon act inside the field's end (copy, reveal, add); Enter in the field presses it. */
	act?: IconAct;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

/** A field box on the surface: hairline at rest, `edge-hover` under the pointer, the ring on focus, `edge-error` when its `FormField` is in error, the disabled fill when it is disabled. In a `Table` cell it stands at the bar fit, named by the cell; in a `ListRow`'s entry or a `Rules` term, named by its label. */
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
