import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { useHeldDraft } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { TextAreaBase } from "./base";

export interface TextAreaProps extends Closed {
	kind?: "prose" | "source";
	/** The value (text; wraps). A selection paints the box, inert, until its read lands and follows it until the viewer types. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<string>;
	onChange: (value: string) => void;
	// Hears the commit; a promise it returns holds the viewer's value while it
	// pends, and a refusal puts it back, with its reason.
	onCommit?: (value: string) => unknown;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; wraps). */
	placeholder?: string;
	budget?: number;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

// Many lines of typing in a field box that grows with its value from three
// body lines, the budget's count under the value in the error ink once over.
// `source` is mono and keeps indentation; a sheet holding one stands full
// height. `onCommit` hears the value once the viewer leaves the field having
// changed it since focus (return is a new line here); with it, a hardware
// Escape puts back the value at focus and leaves the field.
export function TextArea({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	budget,
	autoFocus,
}: TextAreaProps) {
	return (
		<TextAreaBase
			draft={useHeldDraft(value)}
			kind={kind}
			onChange={onChange}
			onCommit={onCommit}
			placeholder={placeholder}
			budget={budget}
			autoFocus={autoFocus}
		/>
	);
}
