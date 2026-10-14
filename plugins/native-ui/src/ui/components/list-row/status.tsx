import type { RowStatus } from "@fcalell/ui-core/descriptors";
import { View } from "react-native";
import { Strut } from "../../lib/strut";
import { StatusBase } from "../status/base";

const MARK = "shrink min-w-0";
// A status waiting: the `Status`'s own waiting form, its bar standing where the
// loaded word does, at the meta line's height; it yields to the first part as
// the status does.
const WAIT = "flex-row shrink min-w-0";

/** A row's status on its meta line: the mark, its word truncating where the line is out of room, or `painted` (the dot's box and a word's filler) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: { status: RowStatus; painted?: boolean }) {
	const { status } = props;
	// Painted before anything reads the status: over a placeholder every key is there.
	if (props.painted)
		return (
			<View className={MARK}>
				<StatusBase painted />
			</View>
		);
	if ("loading" in status)
		return (
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				className={WAIT}
			>
				<Strut role="meta" />
				<StatusBase waiting="short" />
			</View>
		);
	return (
		<View className={MARK}>
			<StatusBase state={status.state} label={status.label} />
		</View>
	);
}
