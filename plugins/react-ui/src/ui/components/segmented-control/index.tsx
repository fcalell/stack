import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Closed } from "../../lib/closed.ts";
import { SegmentedControlBase } from "./base.tsx";

/** One of a segmented control's options. */
export interface Segment {
	value: string;
	/** The option's text (a word; truncates). */
	label: string;
}

/** A view switch over two to four options, one chosen. */
export interface SegmentedControlProps extends Closed {
	/** What the options switch, names the group (a short phrase; read aloud, never drawn). */
	label: string;
	/** The options in order. */
	options: readonly Segment[];
	/** The chosen option's value. A selection paints the track, inert, until its read lands and follows it until the viewer chooses. */
	value: Datum<string>;
	/** Hears the chosen option's value. Return the save's promise and the viewer's value holds while it pends; a refusal puts it back, with its reason. */
	onChange: (value: string) => unknown;
}

/** Segments flush on the group ground, the chosen one under the selection wash in body ink, the others in meta ink. A radio group: the arrow keys move the choice. */
export function SegmentedControl({
	label,
	options,
	value,
	onChange,
}: SegmentedControlProps) {
	return (
		<SegmentedControlBase
			label={label}
			options={options}
			value={value}
			onChange={onChange}
		/>
	);
}
