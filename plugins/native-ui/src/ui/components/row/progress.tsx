import { levelOf } from "@fcalell/ui-core/list-state";
import { METER_TRACK, ROW_PROGRESS } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { Fill } from "../stats/meter";

/** A row's progress: a running task's `value` of its `max` as the meter's bar along the row's foot, at the text column's start, a badge gap under the facts. It fills in the meta ink and turns the good tone once it reaches `max`, never amber. Outside the package's exports. */
export function RowProgress(props: {
	value: number;
	max: number;
	name: string;
}) {
	const { value, max, name } = props;
	if (!(max > 0)) return null;
	const share = Math.min(Math.max(value / max, 0), 1);
	return (
		<View className={ROW_PROGRESS} pointerEvents="none">
			<View
				accessibilityRole="progressbar"
				accessibilityLabel={name}
				accessibilityValue={{
					min: 0,
					max,
					now: Math.min(Math.max(value, 0), max),
				}}
				pointerEvents="none"
				className={METER_TRACK}
			>
				<Fill share={share} level={levelOf(share, undefined, true)} />
			</View>
		</View>
	);
}
