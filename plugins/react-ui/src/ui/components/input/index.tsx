import { Input as Control } from "@base-ui/react/input";
import { cn } from "@fcalell/ui-core/cn";
import type { IconAct } from "@fcalell/ui-core/descriptors";
import {
	FIELD_GLYPH,
	FIELD_UNIT,
	FIGURES,
	type FieldKind,
	field,
	fieldValue,
} from "@fcalell/ui-core/variants";
import { type MouseEvent, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { useCommit } from "../../lib/commit.ts";
import { CellField, EntryField, FieldDisabled } from "../../lib/field.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";

// The box draws the field's states, and a `Select`'s trigger draws the same
// box: the value inside it is a bare line, so the focus ring is the box's and
// the value's own is off. The box rings on its value's focus alone: an act
// inside it rings inset on its own. The guard names the act, not the value,
// so a showcase frame forced to focus still rings the box.
export const BOX = "flex items-center";
export const BOX_HOVER = "hover:border-edge-hover";
// The in-field act answers its own pointer, so the box keeps its edge under it.
export const BOX_HOVER_VALUE = "not-has-[button:hover]:hover:border-edge-hover";
export const BOX_FOCUS =
	"not-has-[button:focus-visible]:has-focus-visible:outline-2 not-has-[button:focus-visible]:has-focus-visible:outline-offset-2 not-has-[button:focus-visible]:has-focus-visible:outline-ring";
export const BOX_DISABLED = "bg-fill-disabled text-ink-disabled";
const VALUE =
	"min-w-0 grow truncate outline-none placeholder:text-ink-meta disabled:text-ink-disabled";
// A search box grows to fill the slot a toolbar gives it.
const SEARCH_BOX = "grow";
// A number in a table cell keeps the cell's end-aligned figures.
const CELL_NUMBER = "text-end";
const UNIT = "shrink-0";
const UNIT_DISABLED = "text-ink-disabled";

// The whole box focuses the value, which is one line tall inside it; a press
// on the value or on the act inside keeps its own.
function focusValue(event: MouseEvent<HTMLDivElement>) {
	if (event.target instanceof Element && event.target.closest("input, button"))
		return;
	event.preventDefault();
	event.currentTarget.querySelector("input")?.focus();
}

export type InputKind =
	| "text"
	| "search"
	| "secret"
	| "source"
	| "number"
	| "email";

const TYPES: Record<InputKind, string> = {
	text: "text",
	search: "text",
	secret: "password",
	source: "text",
	number: "text",
	email: "email",
};

const SURFACE: Record<InputKind, FieldKind> = {
	text: "text",
	search: "search",
	secret: "text",
	source: "code",
	number: "text",
	email: "text",
};

/** One line of typing, the control a `FormField` labels, describes and marks in error. */
export interface InputProps extends Closed {
	/** What is typed: `text` (the default), `search` (a toolbar box with its glyph), `secret`, `source` (mono, a machine reads it), `number` (with `unit`), or `email`. */
	kind?: InputKind;
	/** The value. */
	value: string;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** Hears the value once the viewer is done with it: on leaving the field or on Enter, only when it changed since focus; Escape then puts back the value at focus and leaves the field. */
	onCommit?: (value: string) => void;
	/** The hint drawn while the value is empty; never the field's name. */
	placeholder?: string;
	/** A `number`'s unit, drawn after the value. */
	unit?: string;
	/** An icon act inside the field's end (copy, reveal). */
	act?: IconAct;
}

/** A field box on the surface: hairline at rest, `edge-hover` under the pointer, the ring on focus, `edge-error` when its `FormField` is in error, the disabled fill when it is disabled. In a `Table` cell it stands at the bar fit, named by the cell; in a `ListRow`'s entry, named by the entry's label. */
export function Input({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
}: InputProps) {
	const words = useWords();
	const which = kind ?? "text";
	const surface = SURFACE[which];
	const search = which === "search";
	const cell = use(CellField);
	const entry = use(EntryField);
	const commit = useCommit(value, onChange, onCommit, true);
	return (
		<Control
			value={value}
			onValueChange={(next) => onChange(next)}
			{...commit}
			type={TYPES[which]}
			inputMode={which === "number" ? "decimal" : undefined}
			autoComplete={which === "email" ? "email" : undefined}
			autoCapitalize={which === "text" ? undefined : "off"}
			spellCheck={which === "text" ? undefined : false}
			placeholder={placeholder ?? (search ? words.search : undefined)}
			aria-label={search ? words.search : (cell?.label ?? entry?.label)}
			tabIndex={cell ? -1 : undefined}
			autoFocus={cell?.starts}
			// Base UI's Field wires the control (its id, label, description and
			// validity); the render function hands over its props and state so the
			// box around the value draws that state.
			render={(control, state) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: the press forwards focus to the input inside, which the keyboard reaches on its own
				<div
					onMouseDown={focusValue}
					className={cn(
						field({
							fit: search || cell || entry ? "bar" : "form",
							trailing: act ? "act" : "none",
							state: state.valid === false ? "error" : "rest",
						}),
						FIELD_GLYPH,
						BOX,
						BOX_FOCUS,
						search && SEARCH_BOX,
						state.disabled
							? BOX_DISABLED
							: state.valid !== false && BOX_HOVER_VALUE,
					)}
				>
					{search ? <Icon name="Search" fit="control" /> : null}
					<input
						{...control}
						className={cn(
							fieldValue({ kind: surface }),
							cell && which === "number" && FIGURES,
							VALUE,
							cell && which === "number" && CELL_NUMBER,
						)}
					/>
					{which === "number" && unit ? (
						<span
							className={cn(FIELD_UNIT, UNIT, state.disabled && UNIT_DISABLED)}
						>
							{unit}
						</span>
					) : null}
					{act ? (
						<FieldDisabled value={state.disabled}>
							<IconButton
								icon={act.icon}
								label={act.label}
								onAct={act.onAct}
								fit="field"
							/>
						</FieldDisabled>
					) : null}
				</div>
			)}
		/>
	);
}
