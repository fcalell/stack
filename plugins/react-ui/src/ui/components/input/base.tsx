import { Input as Control } from "@base-ui/react/input";
import { cn } from "@fcalell/ui-core/cn";
import {
	FIELD_GLYPH,
	FIELD_UNIT,
	FIGURES,
	type FieldKind,
	field,
	fieldValue,
} from "@fcalell/ui-core/variants";
import type { KeyboardEvent, MouseEvent } from "react";
import { caretAtEnd } from "../../lib/caret.ts";
import { useCommit } from "../../lib/commit.ts";
import {
	type CellFit,
	FieldDisabled,
	type InlineFit,
} from "../../lib/field.ts";
import {
	BOX_FOCUS,
	POINTER_FOCUS_EDGE,
	useModality,
} from "../../lib/modality.ts";
import { useWords } from "../../lib/words.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import type { InputKind, InputProps } from "./index.tsx";

// The box draws the field's states, and a `Select`'s trigger draws the same
// box: the value inside it is a bare line, so the focus ring is the box's and
// the value's own is off. The box rings on its value's focus alone: an act
// inside it rings inset on its own. The guard names the act, not the value,
// so a showcase frame forced to focus still rings the box.
export const BOX = "flex items-center";
export const BOX_HOVER = `hover:border-edge-hover ${POINTER_FOCUS_EDGE}`;
// The in-field act answers its own pointer, so the box keeps its edge under it.
export const BOX_HOVER_VALUE = `not-has-[button:hover]:hover:border-edge-hover ${POINTER_FOCUS_EDGE}`;
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

/** The field box every Input renders. `cell` is the `Table` cell it edits in, `inline` the `ListRow` entry or `Rules` term it stands in: each sets its bar fit and name. Outside the package's exports. */
export function InputBase({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
	autoFocus,
	cell,
	inline,
}: InputProps & { cell?: CellFit; inline?: InlineFit }) {
	useModality();
	const words = useWords();
	const which = kind ?? "text";
	const surface = SURFACE[which];
	const search = which === "search";
	const commit = useCommit(value, onChange, onCommit, true);
	// Enter presses the act in place of a submit.
	const keys = (event: KeyboardEvent<HTMLElement>) => {
		commit.onKeyDown(event);
		if (!act || event.key !== "Enter") return;
		event.preventDefault();
		act.onAct();
	};
	return (
		<Control
			value={value}
			onValueChange={(next) => onChange(next)}
			{...commit}
			onKeyDown={keys}
			type={TYPES[which]}
			inputMode={which === "number" ? "decimal" : undefined}
			autoComplete={which === "email" ? "email" : undefined}
			autoCapitalize={which === "text" ? undefined : "off"}
			spellCheck={which === "text" ? undefined : false}
			placeholder={placeholder ?? (search ? words.search : undefined)}
			aria-label={search ? words.search : (cell?.label ?? inline?.label)}
			tabIndex={cell ? -1 : undefined}
			autoFocus={autoFocus ?? (cell?.starts || inline?.focus)}
			ref={autoFocus ? caretAtEnd : undefined}
			// Base UI's Field wires the control (its id, label, description and
			// validity); the render function hands over its props and state so the
			// box around the value draws that state. A disabled box carries
			// `aria-disabled` itself: the unit outside the native control reads as
			// disabled to a checker only through an ancestor that says so.
			render={(control, state) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: the press forwards focus to the input inside, which the keyboard reaches on its own
				<div
					onMouseDown={focusValue}
					aria-disabled={state.disabled || undefined}
					className={cn(
						field({
							fit: search || cell || inline ? "bar" : "form",
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
								loading={act.loading}
								fit="field"
							/>
						</FieldDisabled>
					) : null}
				</div>
			)}
		/>
	);
}
