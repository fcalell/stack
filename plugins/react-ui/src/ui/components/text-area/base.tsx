import { Input as Control } from "@base-ui/react/input";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	fieldValue,
	TEXT_AREA_VALUE,
	textArea,
	textAreaBudget,
} from "@fcalell/ui-core/variants";
import { caretAtEnd } from "../../lib/caret.ts";
import { useCommit } from "../../lib/commit.ts";
import {
	BOX_FOCUS,
	POINTER_FOCUS_EDGE,
	useModality,
} from "../../lib/modality.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { TextAreaProps } from "./index.tsx";

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

/** The field box every TextArea renders, on the `draft` its host holds: a field hosts the draft of its text area and draws a rejection in its own line. It grows with its value from three lines, the budget's count under the value. Outside the package's exports. */
export function TextAreaBase({
	draft,
	kind,
	onChange,
	onCommit,
	placeholder,
	budget,
	autoFocus,
}: Omit<TextAreaProps, "value"> & { draft: Draft<string> }) {
	useModality();
	const painted = draft.painted;
	const shown = painted ? "" : draft.value;
	const edit = (next: string) => {
		draft.change(next);
		onChange(next);
	};
	// A commit that returns its save's promise holds the value while it pends.
	const save =
		onCommit && ((next: string) => draft.change(next, () => onCommit(next)));
	const source = kind === "source";
	const commit = useCommit(shown, edit, save, false);
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
