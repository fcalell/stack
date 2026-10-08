import type { RowStatus } from "@fcalell/ui-core/descriptors";
import { lineBox, skeleton } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { useShort } from "../../lib/short";
import { Strut } from "../../lib/strut";
import { StatusBase } from "../status/base";

const MARK = "shrink min-w-0";
// The short form is what the app offered to read whole: it keeps its width and
// the first part takes the overflow.
const MARK_SHORT = "shrink-0";
// A status waiting: a bar a short label wide at the meta line's height, which
// yields to the first part as the status does.
const WAIT = "flex-row items-center w-measure-short shrink min-w-0";
const WAIT_BAR = "grow";
// The long form measured: invisible, over the mark, at the width the visible
// word was given, so it wraps where the visible one truncates.
const TWIN = "absolute opacity-0";

/** A row's status on its meta line: the mark (its short form in place of the label while the long one would be cut on a line `line` wide), or while its read has not answered a bar at the status's place and height. Outside the package's exports. */
export function RowStatusMark(props: { status: RowStatus; line: number }) {
	const { status } = props;
	const [room, setRoom] = useState(0);
	const loading = "loading" in status;
	const { short, decide } = useShort(
		loading || status.short === undefined
			? undefined
			: `${status.label}\n${status.short}`,
		props.line,
	);
	if (loading)
		return (
			<View
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
				className={WAIT}
			>
				<Strut role="meta" />
				<View className={cn(skeleton({ kind: "line" }), WAIT_BAR)} />
			</View>
		);
	return (
		<View className={short ? MARK_SHORT : MARK}>
			<StatusBase
				state={status.state}
				label={status.label}
				short={short ? status.short : undefined}
				onWord={(event) => setRoom(event.nativeEvent.layout.width)}
			/>
			{short || status.short === undefined || room === 0 ? null : (
				<RNText
					// A new width is a new layout to read.
					key={room}
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					className={cn(lineBox({ role: "meta" }), TWIN)}
					style={{ width: room }}
					onTextLayout={(event) => decide(event.nativeEvent.lines.length > 1)}
				>
					{status.label}
				</RNText>
			)}
		</View>
	);
}
