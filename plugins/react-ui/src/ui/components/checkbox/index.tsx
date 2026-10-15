import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed.ts";
import { CheckboxBase } from "./base.tsx";

/** A choice among others, on, off, or mixed over a set. */
export interface CheckboxProps extends Closed {
	/** Whether it is checked; `mixed` when some of the set it stands for are. A selection paints the box, inert, until its read lands and follows it until the viewer toggles it. */
	checked: Datum<boolean | "mixed">;
	/** Hears the next value when the viewer toggles it; a mixed box checks. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (checked: boolean) => unknown;
	/** Its name; the row around it draws the visible label (a short phrase; read aloud, never drawn). */
	label: string;
}

/** A box and its mark, drawn alone inside a target-sized hit box. */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
	return <CheckboxBase checked={checked} onChange={onChange} label={label} />;
}
