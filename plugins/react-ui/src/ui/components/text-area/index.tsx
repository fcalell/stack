import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { useHeldDraft } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { TextAreaBase } from "./base.tsx";

/** Many lines of typing, the control a `FormField` labels, describes and marks in error. */
export interface TextAreaProps extends Closed {
	/** What is typed: `prose` (the default) or `source` (mono, a machine reads it). */
	kind?: "prose" | "source";
	/** The value (text; wraps). A selection paints the box, inert, until its read lands and follows it until the viewer types. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<string>;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** Hears the value once the viewer leaves the field having changed it since focus (Enter is a new line); Escape then puts back the value at focus and leaves the field. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onCommit?: (value: string) => unknown;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; wraps). */
	placeholder?: string;
	/** A word budget: draws the count against it, in the error ink once over. */
	budget?: number;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

/** A field box that grows with its value from three lines, the budget's count under the value. */
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
