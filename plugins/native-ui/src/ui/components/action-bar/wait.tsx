import {
	ACTION_BAR_ACTS,
	type ActionBarFit,
	actionBar,
	skeleton,
} from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";

// The touch structure of the loaded bar (`./index.tsx`): one act per row
// across the container.
const ACTS = "flex-col-reverse";
// An act at the end stands in the control's box, the bar filling it; across,
// at the field's height.
const ACT_END = "min-h-control";
const FILL = "flex-1";

// An ActionBar waiting: `count` act-shaped bars at the loaded geometry (the
// control's box at the end, the field's height across, one per row) and no
// text. Outside the package's exports.
export function ActionBarWait(props: { fit: ActionBarFit; count: number }) {
	const { fit } = props;
	return (
		<View className={actionBar({ fit })}>
			<View className={cn(ACTION_BAR_ACTS, ACTS)}>
				{Array.from({ length: props.count }, (_, at) =>
					fit === "full" ? (
						// biome-ignore lint/suspicious/noArrayIndexKey: the bars are fixed stand-ins
						<View key={at} className={skeleton({ kind: "field" })} />
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: the bars are fixed stand-ins
						<View key={at} className={ACT_END}>
							<View className={cn(skeleton({ kind: "bar" }), FILL)} />
						</View>
					),
				)}
			</View>
		</View>
	);
}
