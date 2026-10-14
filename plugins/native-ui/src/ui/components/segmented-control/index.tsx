import type { Closed } from "../../lib/closed";
import { SegmentedControlBase } from "./base";

export interface Segment {
	value: string;
	/** The option's text (a word; truncates). */
	label: string;
}

export interface SegmentedControlProps extends Closed {
	/** What the options switch, the group's name (a short phrase; read aloud, never drawn). */
	label: string;
	options: readonly Segment[];
	value: string;
	onChange: (value: string) => void;
}

// A view switch over two to four options, one chosen: a radio group.
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
