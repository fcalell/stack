import type { RowStatus } from "@fcalell/ui-core/descriptors";
import { View } from "react-native";
import { Strut } from "../../lib/strut";
import { StatusBase } from "../status/base";

const MARK = "shrink min-w-0";
// A status waiting: the `Status`'s own waiting form, its bar standing where the
// loaded word does, at the meta line's height; it yields to the first part as
// the status does.
const WAIT = "flex-row shrink min-w-0";

/** A row's status on its meta line: the mark, its word truncating where the line is out of room, or while its read has not answered a bar at the status's place and height. Outside the package's exports. */
export function RowStatusMark(props: { status: RowStatus }) {
	const { status } = props;
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
