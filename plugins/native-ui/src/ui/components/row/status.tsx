import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { View } from "react-native";
import { StatusDot } from "../status/dot";

// The status stands in the row's end group, after the value and the marks, as
// its dot alone: its word leads the row's meta line.
const MARK = "shrink min-w-0";

/** A row's status in its end group: the dot (the spinner while `running`), or `painted` (the dot's box) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	painted?: boolean;
}) {
	return (
		<View pointerEvents="none" className={MARK}>
			{props.painted ? (
				<StatusDot tone="done" painted />
			) : (
				<StatusDot tone={props.status.tone} />
			)}
		</View>
	);
}
