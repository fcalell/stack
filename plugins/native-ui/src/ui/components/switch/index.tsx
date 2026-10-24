import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { use } from "react";
import type { Closed } from "../../lib/closed";
import { type Fielded, FieldOwned } from "../../lib/field";
import { FieldBody } from "../form-field";
import { HeldSwitch } from "./base";

/** A setting that takes effect at once, on or off. */
export interface SwitchProps extends Closed, Fielded {
	/** Whether it is on. */
	// A selection paints the track, inert, until its read lands and follows it
	// until the viewer flips it. Once its read ended it stands with no value
	// and a flip says why instead.
	checked: Datum<boolean>;
	/** Hears the next value when the viewer flips it. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (checked: boolean) => unknown;
}

/** A track and its thumb, drawn inside a target-sized hit box. Placed alone it is its field: the label on its line with the switch at the line's end, the description or the error under it. */
export function Switch({
	checked,
	onChange,
	label,
	description,
	optional,
	error,
}: SwitchProps) {
	if (use(FieldOwned))
		return <HeldSwitch checked={checked} onChange={onChange} label={label} />;
	return (
		<FieldBody
			alone
			label={label}
			description={description}
			optional={optional}
			error={error}
			switch={{ checked, onChange }}
		/>
	);
}
