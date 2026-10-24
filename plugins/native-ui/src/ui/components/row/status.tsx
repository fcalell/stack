import type { StatusMark } from "@fcalell/ui-core/descriptors";
import { View } from "react-native";
import { StatusBase } from "../status/base";

// The status passes a press through to the row.
const MARK = "shrink min-w-0";

/** A row's status at the start of its meta line: the dot (the spinner while `running`) and its word, a given word too, or `painted` (the dot's box and a word's filler) while the status is not here. Outside the package's exports. */
export function RowStatusMark(props: {
	status: StatusMark;
	painted?: boolean;
}) {
	const { status, painted } = props;
	return (
		<View pointerEvents="none" className={MARK}>
			{painted ? (
				<StatusBase painted />
			) : (
				<StatusBase tone={status.tone} label={status.label} />
			)}
		</View>
	);
}
