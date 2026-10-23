import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { PickedFile } from "@fcalell/ui-core/descriptors";
import type { IconAct } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { HeldInput } from "./base";
import { CodeField } from "./code";
import { FileField } from "./file";
import { HeldProse } from "./prose";

export type InputKind =
	| "text"
	| "search"
	| "secret"
	| "source"
	| "number"
	| "email"
	| "date";

export interface TextInputProps extends Closed {
	/** What is typed: `text` (the default), `search`, `secret`, `source`, `number`, `email`, or `date` (a day typed into a masked field, digits only with the hyphens of `YYYY-MM-DD` placed as they land; the value is `YYYY-MM-DD`). */
	kind?: InputKind;
	/** The value (text; one line, scrolls in the field). A selection paints the box, inert, until its read lands and follows it until the viewer types. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<string>;
	onChange: (value: string) => void;
	// Hears the commit; a promise it returns holds the viewer's value while it
	// pends, and a refusal puts it back, with its reason.
	onCommit?: (value: string) => unknown;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; truncates). */
	placeholder?: string;
	/** A `number`'s unit, drawn after the value (a word; truncates past the short measure, 20 characters). */
	unit?: string;
	act?: IconAct;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

export interface ProseProps extends Closed {
	/** The value (text; wraps). A selection paints the box, inert, until its read lands and follows it until the viewer types. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<string>;
	onChange: (value: string) => void;
	// Hears the commit; a promise it returns holds the viewer's value while it
	// pends, and a refusal puts it back, with its reason.
	onCommit?: (value: string) => unknown;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; wraps). */
	placeholder?: string;
	/** Mono, for text a machine reads, with its indentation kept. */
	source?: boolean;
	budget?: number;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

export interface CodeInputProps extends Closed {
	length: number;
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => unknown;
}

export interface FilePickProps extends Closed {
	value: PickedFile | null;
	onChange: (file: PickedFile | null) => void;
	accept: readonly string[];
}

export type InputProps =
	| TextInputProps
	| (ProseProps & { kind: "prose" })
	| (CodeInputProps & { kind: "code" })
	| (FilePickProps & { kind: "file" });

// What is typed or picked, by `kind`.
// A line of text is one line of typing in the field box: `edge-error` when
// its `FormField` is in error, the disabled fill when its field is disabled.
// `search` stands at the control's height behind its glyph; `number` opens the
// numeric keyboard and draws `unit` after the value; `source` is text a
// machine reads (a command, a path, a host), mono and never corrected or
// capitalized; `email` opens the email keyboard, offers the address the
// system knows and is never corrected or capitalized; `act` is an icon act
// inside the field's end, which the keyboard's return presses.
// In a `Gate` it takes focus as it mounts unless a typing control there
// holds it.
// `onCommit` hears the value once the viewer is done with it: on leaving the
// field or on the keyboard's return, only when it changed since the field took
// focus; with it, a hardware Escape puts back the value at focus and leaves
// the field. In a `Table` cell it stands at the bar fit, named by the cell,
// focused as the edit starts, a number end-aligned in tabular figures as the
// cell reads. In a list row's entry or a `Rules` term it stands at the bar
// fit, named by its label.
// `prose` is many lines in a field box that grows with its value from three
// body lines, the budget's count under the value in the error ink once over;
// `source` is mono and keeps indentation, and a sheet holding one stands full
// height; return is a new line, and `onCommit` hears the value once the viewer
// leaves the field having changed it since focus.
// `code` is a one-time code: `length` boxes over one string of digits;
// `onComplete` hears the code once its last digit lands, and a promise it
// returns holds the boxes at rest while the code is checked.
// `file` is a field box that is the act: a press opens the system's document
// picker; empty it reads Choose file, chosen it shows the file's name and
// size with an act that removes it. A file of another type is refused in a
// line under the box and never reaches `onChange`.
export function Input(props: InputProps) {
	switch (props.kind) {
		case "prose":
			return <HeldProse {...props} />;
		case "code":
			return <CodeField {...props} />;
		case "file":
			return <FileField {...props} />;
		default:
			return <HeldInput {...props} />;
	}
}
