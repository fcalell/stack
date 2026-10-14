import { Checkbox as Base } from "@base-ui/react/checkbox";
import { useDraft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { ICON_STROKE } from "@fcalell/ui-core/tokens";
import { CHECKBOX_MARK, checkbox } from "@fcalell/ui-core/variants";
import { Check, type IconNode, Minus } from "lucide";
import { createElement } from "react";
import type { LabelFit } from "../../lib/field.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { CheckboxProps } from "./index.tsx";

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
	"relative inline-flex shrink-0 items-center justify-center overflow-hidden group-data-disabled/toggle:border-edge group-data-disabled/toggle:bg-fill-disabled";
const FILLED =
	"relative inline-flex shrink-0 items-center justify-center overflow-hidden group-hover/toggle:bg-toggle-on-hover group-active/toggle:bg-toggle-on-hover group-data-disabled/toggle:bg-fill-disabled";
const WASH =
	"absolute inset-0 group-not-data-disabled/toggle:group-hover/toggle:bg-wash-hover group-not-data-disabled/toggle:group-active/toggle:bg-wash-press";
const MARK = "flex data-disabled:text-ink-disabled";
const GLYPH = "w-full";
const STATES = {
	true: "checked",
	false: "unchecked",
	mixed: "mixed",
} as const;

/** The box every Checkbox renders. `target` is the label a row makes its target; `cell` is the `Table` cell it stands in, where the grid's cursor reaches it; `painted` is the box while its data is not here: filled, unchecked, inert. Outside the package's exports. */
export function CheckboxBase({
	checked,
	onChange,
	label,
	target,
	cell,
	painted: given,
}: CheckboxProps & { target?: LabelFit; cell?: boolean; painted?: boolean }) {
	const draft = useDraft(checked);
	const painted = given || draft.painted;
	const value = draft.value;
	const state = STATES[painted ? "false" : (`${value}` as const)];
	// A field around it disables it through Base UI's field context, which
	// sets `disabled` and `data-disabled` on the hit box and the mark.
	// The hit box is a native button: on a span, Base UI reads the hidden
	// input's `labels` after every render, a walk of the whole document.
	return (
		<Base.Root
			nativeButton
			render={<button type="button" />}
			checked={!painted && value === true}
			indeterminate={!painted && value === "mixed"}
			inert={painted || undefined}
			onCheckedChange={(next) => {
				draft.edit(next);
				onChange(next);
			}}
			aria-label={label}
			aria-labelledby={target?.labelledBy}
			// In a table cell the grid's cursor reaches it, so it leaves the tab
			// order; anywhere else it keeps Base UI's own tab stop, which a
			// `tabIndex` prop given as `undefined` would override.
			{...(cell ? { tabIndex: -1 } : {})}
			className={target ? IN_LABEL : HIT}
		>
			<span
				className={cn(
					checkbox({ state }),
					state === "unchecked" ? UNCHECKED : FILLED,
					RING,
					painted && PAINT_CONTROL,
				)}
			>
				{/* An unchecked box's pointer states are a wash over its own fill. */}
				{state === "unchecked" ? <span className={WASH} /> : null}
				<Base.Indicator className={cn(CHECKBOX_MARK, MARK)}>
					<Mark node={value === "mixed" ? Minus : Check} />
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
			strokeWidth={ICON_STROKE.mark}
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
