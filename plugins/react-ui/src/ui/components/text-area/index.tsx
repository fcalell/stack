import { Input as Control } from "@base-ui/react/input";
import { cn } from "@fcalell/ui-core/cn";
import {
	fieldValue,
	TEXT_AREA_VALUE,
	textArea,
	textAreaBudget,
} from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { useCommit } from "../../lib/commit.ts";

// The box draws the field's states, as `Input`'s does.
const BOX = "flex flex-col";
const BOX_HOVER = "hover:border-edge-hover";
const BOX_FOCUS =
	"has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring";
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
	/** The value. */
	value: string;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** Hears the value once the viewer leaves the field having changed it since focus (Enter is a new line); Escape then puts back the value at focus and leaves the field. */
	onCommit?: (value: string) => void;
	/** The hint drawn while the value is empty; never the field's name. */
	placeholder?: string;
	/** A word budget: draws the count against it, in the error ink once over. */
	budget?: number;
}

/** A field box that grows with its value, the budget's count under the value. */
export function TextArea({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	budget,
}: TextAreaProps) {
	const source = kind === "source";
	const commit = useCommit(value, onChange, onCommit, false);
	const count = budget === undefined ? undefined : wordCount(value);
	return (
		<Control
			value={value}
			onValueChange={(next) => onChange(next)}
			{...commit}
			autoCapitalize={source ? "off" : undefined}
			spellCheck={source ? false : undefined}
			placeholder={placeholder}
			// Base UI's Field wires the control; the render function hands over its
			// props and state so the box around the value draws that state.
			render={(control, state) => (
				<div
					className={cn(
						textArea({ state: state.valid === false ? "error" : "rest" }),
						BOX,
						BOX_FOCUS,
						state.disabled ? BOX_DISABLED : state.valid !== false && BOX_HOVER,
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
