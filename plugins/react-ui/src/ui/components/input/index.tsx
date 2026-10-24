import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { PickedFile } from "@fcalell/ui-core/descriptors";
import { use } from "react";
import type { IconAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { type Fielded, FieldOwned } from "../../lib/field.ts";
import { FieldBody } from "../form-field/index.tsx";
import { HeldInput } from "./base.tsx";
import { CodeField } from "./code.tsx";
import { FileField } from "./file.tsx";
import { HeldProse } from "./prose.tsx";

export type InputKind =
	| "text"
	| "search"
	| "secret"
	| "source"
	| "number"
	| "email"
	| "date";

/** One line of typing. */
export interface TextInputProps extends Closed {
	/** What is typed: `text` (the default), `search` (a toolbar box with its glyph), `secret`, `source` (mono, a machine reads it), `number` (with `unit`), `email`, or `date` (a day, `<input type="date">`, the value `YYYY-MM-DD`). */
	kind?: InputKind;
	/** The value (text; one line, scrolls in the field). A selection paints the box, inert, until its read lands and follows it until the viewer types. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<string>;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** Hears the value once the viewer is done with it: on leaving the field or on Enter, only when it changed since focus; Escape then puts back the value at focus and leaves the field. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onCommit?: (value: string) => unknown;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; truncates). */
	placeholder?: string;
	/** A `number`'s unit, drawn after the value (a word; truncates past the short measure, 20 characters). */
	unit?: string;
	/** An icon act inside the field's end (copy, reveal, add); Enter in the field presses it. */
	act?: IconAct;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

/** Many lines of typing, in a box that grows with its value from three lines. */
export interface ProseProps extends Closed {
	/** The value (text; wraps). A selection paints the box, inert, until its read lands and follows it until the viewer types. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<string>;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** Hears the value once the viewer leaves the field having changed it since focus (Enter is a new line); Escape then puts back the value at focus and leaves the field. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onCommit?: (value: string) => unknown;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; wraps). */
	placeholder?: string;
	/** Mono, for text a machine reads, with its indentation kept. */
	source?: boolean;
	/** A word budget: draws the count against it, in the error ink once over. */
	budget?: number;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

/** A one-time code, one box per digit. */
export interface CodeInputProps extends Closed {
	/** How many digits the code has, one box each. */
	length: number;
	/** The digits typed so far. */
	value: string;
	/** Hears the digits on every change; anything but a digit is dropped. */
	onChange: (value: string) => void;
	/** Hears the code once its last digit lands. Return the check's promise and, while it pends, the boxes hold the code at rest, the input is disabled and a spinner line stands under it; a refusal stands in a line under the boxes, with its reason, and the next digit clears it. */
	onComplete?: (value: string) => unknown;
}

/** One file chosen or dropped. */
export interface FilePickProps extends Closed {
	/** The chosen file; `null` while none is. */
	value: PickedFile | null;
	/** Hears the chosen file, or `null` once it is removed. A file `accept` does not name never reaches it. */
	onChange: (file: PickedFile | null) => void;
	/** The types it takes: MIME types or families (`text/csv`, `image/*`) and extensions (`.har`). */
	accept: readonly string[];
}

/** What is typed or picked, by `kind`: a line of text (the default), `prose`, a one-time `code`, or a `file`. Each kind takes the props only it can use, and every kind its field's: its `label`, and the `description`, `optional` and `error` it draws placed alone. */
export type InputProps = Fielded &
	(
		| TextInputProps
		| (ProseProps & { kind: "prose" })
		| (CodeInputProps & { kind: "code" })
		| (FilePickProps & { kind: "file" })
	);

// The control alone, named by its label: where an owner draws the field
// around it, and a search, which names itself in its box.
function Bare({ props, label }: { props: InputProps; label: string }) {
	switch (props.kind) {
		case "prose":
			return <HeldProse {...props} />;
		case "code":
			return <CodeField {...props} />;
		case "file":
			return <FileField {...props} />;
		default:
			return <HeldInput {...props} inline={{ label }} />;
	}
}

/** A field, named by its `label`: placed alone it draws its label over the box and its `description`, or its `error` (a refused save's reason too, until the next change), under it; in a `Form`'s field or a `Toolbar` the owner names it and nothing is drawn around it, and a `search` names itself. A line of text is a field box on the surface: hairline at rest, `edge-hover` under the pointer, the ring on focus, `edge-error` when its `FormField` is in error, the disabled fill when it is disabled; in a `Table` cell it stands at the bar fit, named by the cell; in a `Row`'s entry or a `Rules` term, named by its label. `prose` grows with its value from three lines, the budget's count under it. `code` is a row of digit boxes over one input; the box the next digit lands in rings on focus. `file` is a box that is the act: empty it reads Choose file, chosen it shows the file's name and size with an act that removes it; a file dropped on the box is taken as one chosen, and a file of another type is refused in a line under the box, which clears on the next pick. */
export function Input(allProps: InputProps) {
	const { label, description, optional, error, ...props } = allProps;
	const owned = use(FieldOwned);
	const control = props as InputProps;
	if (owned || control.kind === "search")
		return <Bare props={control} label={label} />;
	const field = { label, description, optional, error, alone: true };
	switch (control.kind) {
		case "prose": {
			const { kind: _, ...prose } = control;
			return <FieldBody {...field} textArea={prose} />;
		}
		case "code":
		case "file":
			return (
				<FieldBody {...field}>
					<Bare props={control} label={label} />
				</FieldBody>
			);
		default:
			return <FieldBody {...field} input={control} />;
	}
}
