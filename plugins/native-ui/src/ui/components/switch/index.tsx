import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed";
import { HeldSwitch } from "./base";

/** A setting that takes effect at once, on or off. */
export interface SwitchProps extends Closed {
	/** Whether it is on. */
	// A selection paints the track, inert, until its read lands and follows it
	// until the viewer flips it.
	checked: Datum<boolean>;
	/** Hears the next value when the viewer flips it. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (checked: boolean) => unknown;
	/** Its name; the row around it draws the visible label (a short phrase; read aloud, never drawn). */
	label: string;
}

/** A track and its thumb, drawn alone inside a target-sized hit box. */
export function Switch({ checked, onChange, label }: SwitchProps) {
	return <HeldSwitch checked={checked} onChange={onChange} label={label} />;
}
