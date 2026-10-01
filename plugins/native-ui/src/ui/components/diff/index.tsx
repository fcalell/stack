import type { Hunk } from "@fcalell/ui-core/descriptors";
import {
	DIFF_GUTTER,
	diffLine,
	GROUP_GROUND,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, ScrollView, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { lineHunks } from "../../lib/line-diff";
import { LoadingRows } from "../../lib/loading";

interface DiffBase extends Closed {
	loading?: boolean;
}

// The lines come as `hunks`, or as two texts a machine reads, `before` and
// `after`, diffed here by line.
export type DiffProps =
	| (DiffBase & { hunks: readonly Hunk[]; before?: never; after?: never })
	| (DiffBase & { hunks?: never; before: string; after: string });

// A hunk is keyed by its header and its first line numbers, which no two
// hunks of one diff share.
function hunkKey(hunk: Hunk): string {
	const first = hunk.lines[0];
	return `${hunk.header}:${first?.before ?? ""}:${first?.after ?? ""}`;
}

// Mono with a line-number gutter that scrolls with the lines; added lines on
// ok-soft, removed on danger-soft. The phone draws unified.
export function Diff({ hunks: given, before, after, loading }: DiffProps) {
	if (loading) return <LoadingRows />;
	const hunks = given ?? lineHunks(before ?? "", after ?? "");
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className={cn(GROUP_GROUND, "overflow-hidden")}
		>
			<View>
				{hunks.map((hunk) => (
					<View key={hunkKey(hunk)}>
						<RNText className={cn(diffLine({ kind: "header" }), "px-pair")}>
							{hunk.header}
						</RNText>
						{hunk.lines.map((line, index) => (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
								key={index}
								className={cn(
									diffLine({ kind: line.kind }),
									"flex-row gap-inside px-pair",
								)}
							>
								<RNText
									className={cn(
										text({ role: "code" }),
										DIFF_GUTTER,
										"w-8 text-right",
									)}
								>
									{line.before ?? ""}
								</RNText>
								<RNText
									className={cn(
										text({ role: "code" }),
										DIFF_GUTTER,
										"w-8 text-right",
									)}
								>
									{line.after ?? ""}
								</RNText>
								<RNText className={text({ role: "code" })}>
									{line.kind === "added"
										? "+"
										: line.kind === "removed"
											? "−"
											: " "}
									{line.text}
								</RNText>
							</View>
						))}
					</View>
				))}
			</View>
		</ScrollView>
	);
}
