import type { OptionShape } from "@fcalell/ui-core/list-state";
import {
	OPTION_GROUP_LABEL,
	OPTION_LINE,
	ROW_META_LINE,
	row,
	SELECT_GROUP,
	skeleton,
	skeletonLane,
} from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "./cn";
import { Strut } from "./strut";

const LINE = "flex-1 min-w-0 flex-row items-start";
// The box stands on its label's first line, beside a zero-width line of the
// body role.
const BOX_LINE = "flex-row shrink-0 items-center";
const TEXT = "flex-1 min-w-0";
// Loading, each row keeps its height: a box-sized skeleton on the label's
// line, and a bar at a label's length in a short label's lane on each line
// the row draws, a strut setting each line's height.
const LABEL_WAIT = "flex-row items-center";
const STRUT_BAR = "flex-row items-center grow min-w-0";
const BAR_ROOM = "flex-row grow min-w-0";
const ROW_WAIT = "flex-row items-center";
const LABEL_BAR = "w-1/3";
const ROW_BARS = [
	["w-1/3", "w-1/2"],
	["w-2/3", "w-1/3"],
	["w-2/3", "w-1/2"],
	["w-1/2", "w-1/4"],
] as const;

// The waiting rows in the slots the options declare, each led by the mark
// its form draws (a box, or a radio's ring): a group label's bar over them
// when they stand under labels, a description bar under each label when they
// are described. One group per entry of `rows` (four rows in one group unless
// given).
export function OptionWait({
	shape,
	mark,
	rows = [ROW_BARS.length],
}: {
	shape: OptionShape;
	mark: "check" | "radio";
	rows?: readonly number[];
}) {
	return (
		<>
			{rows.map((count, group) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
				<View key={group} className={SELECT_GROUP}>
					{shape.group ? (
						<View className={cn(OPTION_GROUP_LABEL, LABEL_WAIT)}>
							<Strut role="meta" />
							<View className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}>
								<View className={cn(skeleton({ kind: "line" }), LABEL_BAR)} />
							</View>
						</View>
					) : null}
					{Array.from({ length: count }, (_, at) => {
						const [label, description] = ROW_BARS[at % ROW_BARS.length] ?? [];
						return (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
								key={at}
								className={cn(
									row({ lines: shape.description ? "two" : "one" }),
									ROW_WAIT,
								)}
							>
								<View className={cn(OPTION_LINE, LINE)}>
									<View className={BOX_LINE}>
										<Strut role="body" />
										<View className={skeleton({ kind: mark })} />
									</View>
									<View className={TEXT}>
										<View className={STRUT_BAR}>
											<Strut role="body" />
											<View
												className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}
											>
												<View
													className={cn(skeleton({ kind: "line" }), label)}
												/>
											</View>
										</View>
										{shape.description ? (
											<View className={cn(ROW_META_LINE, STRUT_BAR)}>
												<Strut role="meta" />
												<View
													className={cn(
														skeletonLane({ role: "meta" }),
														BAR_ROOM,
													)}
												>
													<View
														className={cn(
															skeleton({ kind: "line" }),
															description,
														)}
													/>
												</View>
											</View>
										) : null}
									</View>
								</View>
							</View>
						);
					})}
				</View>
			))}
		</>
	);
}
