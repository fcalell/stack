import type { Closed } from "../../lib/closed";
import { CheckboxBase } from "./base";

/** A choice among others, on, off, or mixed over a set. */
export interface CheckboxProps extends Closed {
	/** Whether it is checked; `mixed` when some of the set it stands for are. */
	checked: boolean | "mixed";
	/** Hears the next value when the viewer toggles it; a mixed box checks. */
	onChange: (checked: boolean) => void;
	/** Its name; the row around it draws the visible label (a short phrase; read aloud, never drawn). */
	label: string;
}

/** A box and its mark, drawn alone inside a target-sized hit box. */
export function Checkbox({ checked, onChange, label }: CheckboxProps) {
	return <CheckboxBase checked={checked} onChange={onChange} label={label} />;
}
