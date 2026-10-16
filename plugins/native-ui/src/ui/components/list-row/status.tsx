import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { View } from "react-native";
import { StatusBase } from "../status/base";

// The status stands in the row's end group, beside the value or under it: its
// word truncates to what the row leaves.
const MARK = "shrink min-w-0";

/** A row's status in its end group: the mark, its word truncating where the group is out of room, or `painted` (the dot's box and a word's filler) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	painted?: boolean;
}) {
	const { status } = props;
	// Painted before anything reads the status: over a placeholder every key is there.
	if (props.painted)
		return (
			<View pointerEvents="none" className={MARK}>
				<StatusBase painted />
			</View>
		);
	return (
		<View pointerEvents="none" className={MARK}>
			<StatusBase state={status.state} label={status.label} />
		</View>
	);
}
