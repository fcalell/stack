import {
	CONTENT_FRAME,
	lineBox,
	PROSE_DIFF_BODY,
	PROSE_DIFF_TEXT,
	proseDiffRun,
	skeleton,
	text,
} from "@fcalell/ui-core/variants";
import { diffWords } from "diff";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";

const FRAME = "min-w-0 overflow-hidden";
// A line of the body role: a zero-width strut sets its height, the bar
// centred on it.
const LINE = "flex-row items-center";
const STRUT = "​";
// The loading lines, each bar at the length of the line it stands in for.
const BARS = ["w-full", "w-full", "w-full", "w-1/2"] as const;

export interface ProseDiffProps extends Closed {
	// The text before the edit.
	before: string;
	// The text after it.
	after: string;
	// The text waits: four line boxes stand in for it.
	loading?: boolean;
}

// Body text at the measure in the frame Code and Diff share, its edit marked
// in place: a removed run struck through on danger-soft, an added run
// underlined on ok-soft. A nested run cannot carry its own name, so the
// paragraph's spoken text names each run by its kind.
export function ProseDiff({ before, after, loading }: ProseDiffProps) {
	const words = useWords();
	if (loading)
		return (
			<View
				accessibilityState={{ busy: true }}
				className={cn(CONTENT_FRAME, FRAME)}
			>
				<View className={PROSE_DIFF_BODY}>
					<View className={PROSE_DIFF_TEXT}>
						{BARS.map((width, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
							<View key={index} className={LINE}>
								<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
								<View className={cn(skeleton({ kind: "line" }), width)} />
							</View>
						))}
					</View>
				</View>
			</View>
		);
	// A run marks its words alone, its edge whitespace standing outside it;
	// each run is keyed by where it starts in the two texts read together.
	const parts = diffWords(before, after);
	let at = 0;
	const runs: ReactNode[] = [];
	const spoken: string[] = [];
	parts.forEach((part, index) => {
		const key = at;
		at += part.value.length;
		const lead = part.value.match(/^\s*/)?.[0] ?? "";
		const trail = part.value.slice(lead.length).match(/\s*$/)?.[0] ?? "";
		const marked = part.value.slice(
			lead.length,
			part.value.length - trail.length,
		);
		if ((!part.added && !part.removed) || !marked) {
			runs.push(part.value);
			spoken.push(part.value);
			return;
		}
		// A removed run and the added run beside it stand a space apart.
		const previous = parts[index - 1];
		const touching =
			previous !== undefined &&
			(previous.added || previous.removed) &&
			previous.added !== part.added &&
			!/\s$/.test(previous.value) &&
			!lead;
		const gap = touching ? " " : lead;
		const kind = part.removed ? "removed" : "added";
		runs.push(
			gap,
			<RNText key={key} className={proseDiffRun({ kind })}>
				{marked}
			</RNText>,
			trail,
		);
		spoken.push(gap, `${words[kind]} ${marked}`, trail);
	});
	return (
		<View className={cn(CONTENT_FRAME, FRAME)}>
			<View className={PROSE_DIFF_BODY}>
				<RNText
					accessibilityLabel={spoken.join("")}
					className={cn(text({ role: "body" }), PROSE_DIFF_TEXT)}
				>
					{runs}
				</RNText>
			</View>
		</View>
	);
}
