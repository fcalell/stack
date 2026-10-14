import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { View } from "react-native";
import { StatusBase } from "../status/base";

const MARK = "shrink min-w-0";

/** A row's status on its meta line: the mark, its word truncating where the line is out of room, or `painted` (the dot's box and a word's filler) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	painted?: boolean;
}) {
	const { status } = props;
	// Painted before anything reads the status: over a placeholder every key is there.
	if (props.painted)
		return (
			<View className={MARK}>
				<StatusBase painted />
			</View>
		);
	return (
		<View className={MARK}>
			<StatusBase state={status.state} label={status.label} />
		</View>
	);
}
