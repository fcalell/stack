import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { StatusBase } from "../status/base.tsx";

// The status stands in the row's end group, beside the value or under it: its
// word truncates to what the group's cap leaves, so a status wider than that is
// cut and the text group keeps its two fifths of the row.
const MARK = "flex min-w-0";

/** A row's status in its end group: the mark, its word truncating where the group is out of room, or `painted` (the dot's box and a word's filler) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	painted?: boolean;
}) {
	const { status } = props;
	// Painted before anything reads the status: over a placeholder every key is there.
	if (props.painted)
		return (
			<span className={MARK}>
				<StatusBase painted />
			</span>
		);
	return (
		<span className={MARK}>
			<StatusBase state={status.state} label={status.label} />
		</span>
	);
}
