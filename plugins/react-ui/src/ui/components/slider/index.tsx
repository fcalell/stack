import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import { use } from "react";
import { useHeldDraft } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { type Fielded, FieldOwned } from "../../lib/field.ts";
import { FieldBody } from "../form-field/index.tsx";
import { SliderBase } from "./base.tsx";

/** A number picked along a range, its label over the track. */
export interface SliderProps extends Closed, Fielded {
	/** The value, between `min` and `max`. A selection paints the track, inert, until its read lands and follows it until the viewer moves it. Once its read ended the control stands with no value and a change says why instead. */
	value: Datum<number>;
	/** Hears each value the viewer moves it to. */
	onChange: (value: number) => void;
	/** Hears the value the viewer lets go of the thumb on (a key's step is one). Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onCommit?: (value: number) => unknown;
	/** The value at the track's start. */
	min: number;
	/** The value at the track's end. */
	max: number;
	/** The distance between two values it can take; 1 unless set. */
	step?: number;
	/** An Intl unit identifier (`minute`, `percent`), formatted after the value in the viewer's locale. */
	unit?: string;
}

/** A slider's label and value over its track: the fill up to the thumb, the rest after it, the label naming the thumb (it truncates). Placed alone it is its field, the description or the error under the track. Painted, the label stands and the value and the track are filled, at the same height. */
export function Slider({
	label,
	description,
	optional,
	error,
	value,
	...range
}: SliderProps) {
	if (use(FieldOwned))
		return <OwnedSlider label={label} value={value} {...range} />;
	return (
		<FieldBody
			alone
			label={label}
			description={description}
			optional={optional}
			error={error}
			slider={{ value, ...range }}
		/>
	);
}

// A slider whose owner draws its field: it holds its own draft.
function OwnedSlider({
	value,
	...rest
}: Omit<SliderProps, "description" | "optional" | "error">) {
	return <SliderBase {...rest} draft={useHeldDraft(value)} />;
}
