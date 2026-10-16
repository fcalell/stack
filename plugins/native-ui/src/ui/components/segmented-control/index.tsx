import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed";
import { HeldSegmentedControl } from "./base";

export interface Segment {
	value: string;
	/** The option's text (a word; truncates). */
	label: string;
}

export interface SegmentedControlProps extends Closed {
	/** What the options switch, the group's name (a short phrase; read aloud, never drawn). */
	label: string;
	options: readonly Segment[];
	// A selection paints the track, inert, until its read lands and follows it
	// until the viewer chooses. Once its read ended it stands with no value
	// and a choice says why instead.
	value: Datum<string>;
	// A promise it returns holds the viewer's value while it pends; a refusal
	// puts it back, with its reason.
	onChange: (value: string) => unknown;
}

// A view switch over two to four options, one chosen: a radio group.
export function SegmentedControl({
	label,
	options,
	value,
	onChange,
}: SegmentedControlProps) {
	return (
		<HeldSegmentedControl
			label={label}
			options={options}
			value={value}
			onChange={onChange}
		/>
	);
}
