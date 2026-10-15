import { Input as Control } from "@base-ui/react/input";
import { type Datum, useDraft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	fieldValue,
	TEXT_AREA_VALUE,
	textArea,
	textAreaBudget,
} from "@fcalell/ui-core/variants";
import { caretAtEnd } from "../../lib/caret.ts";
import type { Closed } from "../../lib/closed.ts";
import { useCommit } from "../../lib/commit.ts";
import {
	BOX_FOCUS,
	POINTER_FOCUS_EDGE,
	useModality,
} from "../../lib/modality.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";

// The box draws the field's states, as `Input`'s does.
const BOX = "flex flex-col";
const BOX_HOVER = `hover:border-edge-hover ${POINTER_FOCUS_EDGE}`;
const BOX_DISABLED = "bg-fill-disabled";
const VALUE =
	"block w-full resize-none field-sizing-content outline-none placeholder:text-ink-meta disabled:text-ink-disabled";
const BUDGET_LINE = "flex justify-end";
const BUDGET_DISABLED = "text-ink-disabled";

function wordCount(value: string): number {
	return value.split(/\s+/).filter(Boolean).length;
}

/** Many lines of typing, the control a `FormField` labels, describes and marks in error. */
export interface TextAreaProps extends Closed {
	/** What is typed: `prose` (the default) or `source` (mono, a machine reads it). */
	kind?: "prose" | "source";
	/** The value (text; wraps). A selection paints the box, inert, until its read lands and follows it until the viewer types. */
	value: Datum<string>;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** Hears the value once the viewer leaves the field having changed it since focus (Enter is a new line); Escape then puts back the value at focus and leaves the field. */
	onCommit?: (value: string) => void;
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
	useModality();
	const draft = useDraft(value);
	const painted = draft.painted;
	const shown = painted ? "" : draft.value;
	const edit = (next: string) => {
		draft.change(next);
		onChange(next);
	};
	const source = kind === "source";
	const commit = useCommit(shown, edit, onCommit, false);
	const count = budget === undefined ? undefined : wordCount(shown);
	return (
		<Control
			value={shown}
			onValueChange={edit}
			{...commit}
			autoCapitalize={source ? "off" : undefined}
			spellCheck={source ? false : undefined}
			placeholder={placeholder}
			autoFocus={autoFocus}
			ref={autoFocus ? caretAtEnd : undefined}
			// Base UI's Field wires the control; the render function hands over its
			// props and state so the box around the value draws that state. A
			// disabled box carries `aria-disabled` itself, so the budget outside the
			// native control reads as disabled to a checker.
			render={(control, state) => (
				<div
					aria-disabled={state.disabled || undefined}
					inert={painted || undefined}
					className={cn(
						textArea({ state: state.valid === false ? "error" : "rest" }),
						BOX,
						BOX_FOCUS,
						state.disabled ? BOX_DISABLED : state.valid !== false && BOX_HOVER,
						painted && cn(PAINT_CONTROL, "*:invisible"),
					)}
				>
					<textarea
						{...control}
						className={cn(
							fieldValue({ kind: source ? "code" : "text" }),
							TEXT_AREA_VALUE,
							VALUE,
						)}
					/>
					{count !== undefined && budget !== undefined ? (
						<div className={BUDGET_LINE}>
							<span
								className={cn(
									textAreaBudget({ state: count > budget ? "error" : "rest" }),
									state.disabled && BUDGET_DISABLED,
								)}
							>
								{count} / {budget}
							</span>
						</div>
					) : null}
				</div>
			)}
		/>
	);
}
