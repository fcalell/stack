import { Input as Control } from "@base-ui/react/input";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { wordCount } from "@fcalell/ui-core/controls";
import {
	fieldValue,
	TEXT_AREA_VALUE,
	textArea,
	textAreaBudget,
} from "@fcalell/ui-core/variants";
import { useHeldDraft } from "../../lib/act.ts";
import { caretAtEnd } from "../../lib/caret.ts";
import { useCommit } from "../../lib/commit.ts";
import { BOX_FOCUS, FOCUS_EDGE, useModality } from "../../lib/modality.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { ProseProps } from "./index.tsx";

// The box draws the field's states, as `Input`'s does.
const BOX = "flex flex-col";
const BOX_HOVER = `not-has-focus-visible:hover:border-edge-hover ${FOCUS_EDGE}`;
const BOX_DISABLED = "bg-fill-disabled";
const VALUE =
	"block w-full resize-none field-sizing-content outline-none placeholder:text-ink-meta disabled:text-ink-disabled";
const BUDGET_LINE = "flex justify-end";
const BUDGET_DISABLED = "text-ink-disabled";

/** The field box every prose Input renders, on the `draft` its host holds: a field hosts the draft of its text area and draws a rejection in its own line. It grows with its value from three lines, the budget's count under the value. Outside the package's exports. */
export function ProseBase({
	draft,
	source,
	onChange,
	onCommit,
	placeholder,
	budget,
	autoFocus,
}: Omit<ProseProps, "value"> & { draft: Draft<string> }) {
	useModality();
	// A read that ended leaves the box empty and blocked: a keystroke says why
	// and changes nothing.
	const ended = draft.ended !== undefined;
	const painted = draft.painted && !ended;
	const shown = draft.painted ? "" : draft.value;
	const edit = (next: string) => {
		draft.change(next);
		if (!ended) onChange(next);
	};
	// A commit that returns its save's promise holds the value while it pends.
	const save =
		onCommit && ((next: string) => draft.change(next, () => onCommit(next)));
	const mono = source === true;
	const commit = useCommit(shown, edit, save, false);
	const count = budget === undefined ? undefined : wordCount(shown);
	return (
		<Control
			value={shown}
			onValueChange={edit}
			onFocus={commit.onFocus}
			onBlur={commit.onBlur}
			onKeyDown={commit.onKeyDown}
			autoCapitalize={mono ? "off" : undefined}
			spellCheck={mono ? false : undefined}
			placeholder={placeholder}
			autoFocus={autoFocus}
			ref={autoFocus ? caretAtEnd : undefined}
			// Base UI's Field wires the control; the render function hands over its
			// props and state so the box around the value draws that state. A
			// disabled box carries `aria-disabled` itself, so the budget outside the
			// native control reads as disabled to a checker.
			render={(control, state) => (
				<div
					aria-disabled={state.disabled || ended || undefined}
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
							fieldValue({ kind: mono ? "code" : "text" }),
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

/** A prose Input that holds its own draft, as a bare one does; a rejection toasts. */
export function HeldProse({ value, ...rest }: ProseProps) {
	return <ProseBase draft={useHeldDraft(value)} {...rest} />;
}
