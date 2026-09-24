import type { Hunk } from "@fcalell/ui-core/descriptors";
import { DIFF_GUTTER, diffLine, GROUP, text } from "@fcalell/ui-core/variants";
import { Text as RNText, ScrollView, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";

export interface DiffProps extends Closed {
	hunks: readonly Hunk[];
	layout?: "unified" | "split";
	loading?: boolean;
}

// A hunk is keyed by its header and its first line numbers, which no two
// hunks of one diff share.
function hunkKey(hunk: Hunk): string {
	const first = hunk.lines[0];
	return `${hunk.header}:${first?.before ?? ""}:${first?.after ?? ""}`;
}

// Mono with a line-number gutter that scrolls with the lines; added lines on
// ok-soft, removed on danger-soft. The phone draws unified whatever `layout`.
export function Diff({ hunks, loading }: DiffProps) {
	if (loading) return <LoadingRows />;
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className={cn(GROUP, "overflow-hidden")}
		>
			<View>
				{hunks.map((hunk) => (
					<View key={hunkKey(hunk)}>
						<RNText className={cn(diffLine({ kind: "header" }), "px-stack")}>
							{hunk.header}
						</RNText>
						{hunk.lines.map((line, index) => (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
								key={index}
								className={cn(
									diffLine({ kind: line.kind }),
									"flex-row gap-row px-stack",
								)}
							>
								<RNText
									className={cn(
										text({ role: "mono" }),
										DIFF_GUTTER,
										"w-8 text-right",
									)}
								>
									{line.before ?? ""}
								</RNText>
								<RNText
									className={cn(
										text({ role: "mono" }),
										DIFF_GUTTER,
										"w-8 text-right",
									)}
								>
									{line.after ?? ""}
								</RNText>
								<RNText className={text({ role: "mono" })}>
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
