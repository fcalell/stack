import { Input as Control } from "@base-ui/react/input";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
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
import { useAct, useHeldDraft } from "../../lib/act.ts";
import { caretAtEnd } from "../../lib/caret.ts";
import { useCommit } from "../../lib/commit.ts";
import {
	type CellFit,
	FieldDisabled,
	type InlineFit,
} from "../../lib/field.ts";
import { BOX_FOCUS, FOCUS_EDGE, useModality } from "../../lib/modality.ts";
import { day } from "../../lib/moment.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";
import { ActSheet } from "../sheet/act.tsx";
import type { InputKind, TextInputProps } from "./index.tsx";

// The box draws the field's states, and a `Picker`'s trigger in a field draws
// the same box: the value inside it is a bare line, so the focus ring is the box's and
// the value's own is off. The box rings on its value's focus alone: an act
// inside it rings inset on its own. The guard names the act, not the value,
// so a showcase frame forced to focus still rings the box.
export const BOX = "flex items-center";
export const BOX_HOVER = `not-has-focus-visible:hover:border-edge-hover ${FOCUS_EDGE}`;
// The in-field act answers its own pointer, so the box keeps its edge under it.
export const BOX_HOVER_VALUE = `not-has-[button:hover]:not-has-focus-visible:hover:border-edge-hover ${FOCUS_EDGE}`;
export const BOX_DISABLED = "bg-fill-disabled text-ink-disabled";
// The value fills the box's height, border included (as an act in the box
// does), so the element a pointer lands on is the box's size, not a line's.
const VALUE =
	"min-w-0 grow self-stretch -my-hairline truncate outline-none placeholder:text-ink-meta disabled:text-ink-disabled";
// A `source` value is a command or a path that outruns a phone, so at the
// field's own fit it is a one-line text area that wraps at any character and
// grows the box with its lines, where a line of text would cut its end and
// leave the rest unread (touch has no tooltip). It fills the box, border
// included, as the input does, so the element a pointer lands on is the box's
// size (the target floor on touch), and its padding stands one line in the
// middle of a control's height, where the input's line stands.
const WRAPPED =
	"block min-w-0 grow self-stretch -my-hairline resize-none field-sizing-content py-[calc((var(--spacing-control)-1lh)/2)] wrap-anywhere outline-none placeholder:text-ink-meta disabled:text-ink-disabled";
// A date's native control stands over its face: the face reads the day in the
// app's own words ("26 Oct 2026") or the empty word, and the control, which
// owns the picker (touch opens the platform's own) and the segments' keys
// (type, Backspace clears), draws its segments only while it holds focus. It
// fills the slot, so the element a pointer lands on is the box's size.
const DATE_SLOT = "relative flex items-center min-w-0 grow self-stretch";
const DATE_CONTROL =
	"peer absolute inset-0 size-full p-0 outline-none disabled:text-ink-disabled not-focus:text-transparent";
const DATE_FACE = "pointer-events-none truncate peer-focus:invisible";
// A search box grows to fill the slot a toolbar gives it.
const SEARCH_BOX = "grow";
// A number in a table cell keeps the cell's end-aligned figures.
const CELL_NUMBER = "text-end";
const UNIT = "shrink-0 truncate";
const UNIT_DISABLED = "text-ink-disabled";

// The whole box focuses the value, which is one line tall inside it; a press
// on the value or on the act inside keeps its own.
function focusValue(event: MouseEvent<HTMLDivElement>) {
	if (
		event.target instanceof Element &&
		event.target.closest("input, textarea, button")
	)
		return;
	event.preventDefault();
	event.currentTarget.querySelector<HTMLElement>("input, textarea")?.focus();
}

const TYPES: Record<InputKind, string> = {
	text: "text",
	search: "text",
	secret: "password",
	source: "text",
	number: "text",
	email: "email",
	date: "date",
};

const SURFACE: Record<InputKind, FieldKind> = {
	text: "text",
	search: "search",
	secret: "text",
	source: "code",
	number: "text",
	email: "text",
	date: "text",
};

/** The field box every Input renders, on the `draft` its host holds: a field hosts the draft of its input and draws a rejection in its own line. `cell` is the `Table` cell it edits in, `inline` the `Row` entry or `Rules` term it stands in: each sets its bar fit and name. `painted` is the box while its data is not here: filled at its loaded size, the value not drawn, inert. Outside the package's exports. */
export function InputBase({
	draft,
	kind,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
	autoFocus,
	cell,
	inline,
	painted: given,
}: Omit<TextInputProps, "value"> & {
	draft: Draft<string>;
	cell?: CellFit;
	inline?: InlineFit;
	painted?: boolean;
}) {
	useModality();
	// The act runs through one holder, whether Enter or its icon presses it.
	const acting = useAct("toast");
	// A read that ended leaves the box empty and blocked: a keystroke says why
	// and changes nothing.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const shown = painted || ended ? "" : (draft.value ?? "");
	const which = kind ?? "text";
	// The wrapped form is a text area standing for one line: Enter never starts
	// a second, and a pasted newline is a space, as an input takes it.
	const wraps =
		which === "source" && !cell && (!inline || inline.field === true);
	const edit = (next: string) => {
		const one = wraps ? next.replace(/\r?\n/g, " ") : next;
		draft.change(one);
		if (!ended) onChange(one);
	};
	// A commit that returns its save's promise holds the value while it pends.
	const save =
		onCommit && ((next: string) => draft.change(next, () => onCommit(next)));
	const words = useWords();
	const surface = SURFACE[which];
	const search = which === "search";
	const dated = which === "date";
	const commit = useCommit(shown, edit, save, true);
	// Enter presses the act in place of a submit; on a secret it commits, since
	// its act (remove) is never what typing ends with.
	const keys = (event: KeyboardEvent<HTMLElement>) => {
		commit.onKeyDown(event);
		if (event.key !== "Enter") return;
		// A text area has no implicit submit, which a line of text has.
		if (wraps && !act) {
			event.preventDefault();
			(event.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
			return;
		}
		if (!act || which === "secret") return;
		event.preventDefault();
		if (act.blocked === undefined && !acting.holds) acting.run(true, act);
	};
	return (
		<Control
			value={shown}
			onValueChange={edit}
			onFocus={commit.onFocus}
			onBlur={commit.onBlur}
			onKeyDown={keys}
			type={wraps ? undefined : TYPES[which]}
			inputMode={which === "number" ? "decimal" : undefined}
			autoComplete={which === "email" ? "email" : undefined}
			autoCapitalize={which === "text" ? undefined : "off"}
			spellCheck={which === "text" ? undefined : false}
			placeholder={
				dated ? undefined : (placeholder ?? (search ? words.search : undefined))
			}
			aria-label={
				cell?.label ?? inline?.label ?? (search ? words.search : undefined)
			}
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
					aria-disabled={state.disabled || ended || undefined}
					inert={painted || undefined}
					className={cn(
						field({
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
						painted && cn(PAINT_CONTROL, "*:invisible"),
					)}
				>
					{search ? <Icon name="Search" fit="control" /> : null}
					{wraps ? (
						<textarea
							{...control}
							rows={1}
							className={cn(fieldValue({ kind: surface }), WRAPPED)}
						/>
					) : dated ? (
						<span className={DATE_SLOT}>
							<input
								{...control}
								className={cn(fieldValue({ kind: surface }), DATE_CONTROL)}
							/>
							<span
								className={cn(
									fieldValue({ kind: surface }),
									DATE_FACE,
									shown === "" && !state.disabled && "text-ink-meta",
								)}
							>
								{shown === "" ? (placeholder ?? words.none) : day(shown)}
							</span>
						</span>
					) : (
						<input
							{...control}
							className={cn(
								fieldValue({ kind: surface }),
								cell && which === "number" && FIGURES,
								VALUE,
								cell && which === "number" && CELL_NUMBER,
							)}
						/>
					)}
					{which === "number" && unit ? (
						<span
							className={cn(FIELD_UNIT, UNIT, state.disabled && UNIT_DISABLED)}
						>
							{unit}
						</span>
					) : null}
					{act ? (
						<FieldDisabled value={state.disabled}>
							<IconButtonBase
								icon={act.icon}
								fit="field"
								label={act.label}
								destructive={act.destructive}
								disabled={act.blocked !== undefined}
								pending={acting.pending !== undefined}
								onClick={() => acting.run(true, act)}
							/>
							<ActSheet acting={acting} of={() => act.sheet} />
						</FieldDisabled>
					) : null}
				</div>
			)}
		/>
	);
}

/** An Input that holds its own draft, as a bare one, a cell and a rule's term do; a rejection toasts. Outside the package's exports. */
export function HeldInput({
	value,
	kind,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
	autoFocus,
	cell,
	inline,
	painted,
}: TextInputProps & { cell?: CellFit; inline?: InlineFit; painted?: boolean }) {
	return (
		<InputBase
			draft={useHeldDraft(value)}
			kind={kind}
			onChange={onChange}
			onCommit={onCommit}
			placeholder={placeholder}
			unit={unit}
			act={act}
			autoFocus={autoFocus}
			cell={cell}
			inline={inline}
			painted={painted}
		/>
	);
}
