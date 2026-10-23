import { Checkbox as Base } from "@base-ui/react/checkbox";
import type { Datum, Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { STATES } from "@fcalell/ui-core/controls";
import { ICON_STROKE } from "@fcalell/ui-core/tokens";
import { ANSWER, CHECKBOX_MARK, checkbox } from "@fcalell/ui-core/variants";
import { Check, type IconNode, Minus } from "lucide";
import { createElement } from "react";
import { useHeldDraft } from "../../lib/act.ts";
import type { LabelFit } from "../../lib/field.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";

/** A choice among others, on, off, or mixed over a set: the tick a row, a table's cell or head, an option or a field's `checkbox` descriptor draws. Outside the package's exports. */
export interface CheckboxProps {
	/** Whether it is checked; `mixed` when some of the set it stands for are. A selection paints the box, inert, until its read lands and follows it until the viewer toggles it. Once its read ended the control stands with no value and a change says why instead. */
	checked: Datum<boolean | "mixed">;
	/** Hears the next value when the viewer toggles it; a mixed box checks. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (checked: boolean) => unknown;
	/** Its name; the row around it draws the visible label (a short phrase; read aloud, never drawn). */
	label: string;
}

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
const WASH = `absolute inset-0 ${ANSWER} group-not-data-disabled/toggle:group-hover/toggle:bg-wash-hover group-not-data-disabled/toggle:group-active/toggle:bg-wash-press`;
const MARK = "relative flex data-disabled:text-ink-disabled";
const GLYPH = "w-full";
// Checked and mixed stand one over the other and cross-fade when the box moves
// between them (the indicator stays mounted); the check is the mark at rest.
const CHECKED = "in-data-indeterminate:opacity-0";
const MIXED = "absolute inset-0 opacity-0 in-data-indeterminate:opacity-100";

/** The tick box every selection renders, on the `draft` its host holds: a field hosts the draft of its checkbox and draws a rejection in its own line. `target` is the label a row makes its target; `cell` is the `Table` cell it stands in, where the grid's cursor reaches it; `painted` is the box while its data is not here: filled, unchecked, inert. Outside the package's exports. */
export function CheckboxBase({
	draft,
	onChange,
	label,
	target,
	cell,
	tabIndex,
	painted: given,
}: Omit<CheckboxProps, "checked"> & {
	draft: Draft<boolean | "mixed">;
	target?: LabelFit;
	cell?: boolean;
	/** `-1` where the box's host holds the tab stop (a tree's row); absent, it keeps Base UI's own. */
	tabIndex?: -1;
	painted?: boolean;
}) {
	// A read that ended leaves the box empty and blocked.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const absent = painted || ended;
	const value = draft.value;
	const state = STATES[absent ? "false" : (`${value}` as const)];
	// A field around it disables it through Base UI's field context, which
	// sets `disabled` and `data-disabled` on the hit box and the mark.
	// The hit box is a native button: on a span, Base UI reads the hidden
	// input's `labels` after every render, a walk of the whole document.
	return (
		<Base.Root
			nativeButton
			render={<button type="button" />}
			checked={!absent && value === true}
			indeterminate={!absent && value === "mixed"}
			inert={painted || undefined}
			aria-disabled={ended || undefined}
			onCheckedChange={(next) => {
				draft.change(next, () => onChange(next));
			}}
			aria-label={label}
			aria-labelledby={target?.labelledBy}
			// In a table cell the grid's cursor reaches it, so it leaves the tab
			// order; anywhere else it keeps Base UI's own tab stop, which a
			// `tabIndex` prop given as `undefined` would override.
			{...(cell || tabIndex === -1 ? { tabIndex: -1 } : {})}
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
					<Mark node={Check} look={cn(ANSWER, CHECKED)} />
					<Mark node={Minus} look={cn(ANSWER, MIXED)} />
				</Base.Indicator>
			</span>
		</Base.Root>
	);
}

/** A tick box that holds its own draft, as a row's and a cell's do; a rejection toasts. Outside the package's exports. */
export function HeldCheckbox({
	checked,
	onChange,
	label,
	target,
	cell,
	tabIndex,
	painted,
}: CheckboxProps & {
	target?: LabelFit;
	cell?: boolean;
	tabIndex?: -1;
	painted?: boolean;
}) {
	return (
		<CheckboxBase
			draft={useHeldDraft(checked)}
			onChange={onChange}
			label={label}
			target={target}
			cell={cell}
			tabIndex={tabIndex}
			painted={painted}
		/>
	);
}

// Lucide's own path data, drawn at the check's own weight rather than `Icon`'s.
function Mark({ node, look }: { node: IconNode; look: string }) {
	return (
		<svg
			className={cn(GLYPH, look)}
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
