import { Checkbox as Base } from "@base-ui/react/checkbox";
import { cn } from "@fcalell/ui-core/cn";
import { CHECKBOX_MARK, checkbox } from "@fcalell/ui-core/variants";
import { Check, type IconNode, Minus } from "lucide";
import { createElement, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { CellField, LabelTarget } from "../../lib/field.ts";

// The checkbox element is the target-sized hit box, so a press anywhere in it
// toggles; the box inside draws the states and the focus ring. In a row whose
// label is its target the element is the box's size.
const HIT =
	"group/toggle inline-flex shrink-0 items-center justify-center size-target outline-none";
const IN_LABEL =
	"group/toggle inline-flex shrink-0 items-center justify-center outline-none";
const RING =
	"group-focus-visible/toggle:outline-2 group-focus-visible/toggle:outline-offset-2 group-focus-visible/toggle:outline-ring";
const UNCHECKED =
	"relative inline-flex shrink-0 items-center justify-center overflow-hidden group-aria-disabled/toggle:border-edge group-aria-disabled/toggle:bg-fill-disabled";
const FILLED =
	"relative inline-flex shrink-0 items-center justify-center overflow-hidden group-hover/toggle:bg-toggle-on-hover group-active/toggle:bg-toggle-on-hover group-aria-disabled/toggle:bg-fill-disabled";
const WASH =
	"absolute inset-0 group-not-aria-disabled/toggle:group-hover/toggle:bg-wash-hover group-not-aria-disabled/toggle:group-active/toggle:bg-wash-press";
const MARK = "flex data-disabled:text-ink-disabled";
const GLYPH = "w-full";
// Lucide's 24-unit grid at the mark's 12 px (desktop) or 14 px (touch): 3.5
// units draw 1.75 px or 2.04 px.
const STROKE = 3.5;
const STATES = {
	true: "checked",
	false: "unchecked",
	mixed: "mixed",
} as const;

/** A choice among others, on, off, or mixed over a set. */
export interface CheckboxProps extends Closed {
	/** Whether it is checked; `mixed` when some of the set it stands for are. */
	checked: boolean | "mixed";
	/** Hears the next value when the viewer toggles it; a mixed box checks. */
	onChange: (checked: boolean) => void;
	/** Its name, read aloud; the row around it draws the visible label. */
	label: string;
}

/** A box and its mark, drawn alone inside a target-sized hit box. */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
	const state = STATES[`${checked}` as const];
	const target = use(LabelTarget);
	// In a table cell the grid's cursor reaches it, so it leaves the tab order;
	// anywhere else it keeps Base UI's own tab stop, which a `tabIndex` prop
	// given as `undefined` would override.
	const cell = use(CellField);
	// A field around it disables it through Base UI's field context, which
	// sets `aria-disabled` on the hit box and `data-disabled` on the mark.
	return (
		<Base.Root
			checked={checked === true}
			indeterminate={checked === "mixed"}
			onCheckedChange={(next) => onChange(next)}
			aria-label={label}
			aria-labelledby={target?.labelledBy}
			aria-describedby={target?.describedBy}
			{...(cell ? { tabIndex: -1 } : {})}
			className={target ? IN_LABEL : HIT}
		>
			<span
				className={cn(
					checkbox({ state }),
					state === "unchecked" ? UNCHECKED : FILLED,
					RING,
				)}
			>
				{/* An unchecked box's pointer states are a wash over its own fill. */}
				{state === "unchecked" ? <span className={WASH} /> : null}
				<Base.Indicator className={cn(CHECKBOX_MARK, MARK)}>
					<Mark node={checked === "mixed" ? Minus : Check} />
				</Base.Indicator>
			</span>
		</Base.Root>
	);
}

// Lucide's own path data, drawn at the check's own weight rather than `Icon`'s.
function Mark({ node }: { node: IconNode }) {
	return (
		<svg
			className={GLYPH}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={STROKE}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{node.map(([tag, attrs], index) =>
				createElement(tag, { key: index, ...attrs }),
			)}
		</svg>
	);
}
