import {
	LIST,
	lineBox,
	ROW_TITLE_LINE,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingContext, LoadingRow } from "../../lib/loading";

const ROW_WAIT = "flex-row items-center";
const AVATAR_WAIT = "shrink-0";
const LINES_WAIT = "grow min-w-0";
// The loading rows' bars, a name over a line, each at the length of the line
// it stands in for.
const BARS = [
	["w-1/2", "w-1/3"],
	["w-2/3", "w-1/4"],
	["w-3/4", "w-1/3"],
	["w-1/2", "w-1/4"],
] as const;
// A row with a trailing value and no leading: its title's bar beside the
// trailing's, over its meta's, each in its line's box (a strut sets the
// line's height, as the web's `h-lh` does).
const LINES = "grow min-w-0";
const LINE = "flex-row items-center";
const TITLE_SLOT = "flex-row items-center grow min-w-0";
const TRAILING_WAIT = "shrink-0";
const STRUT = "​";
const TRAILING_BARS = [
	["w-1/2", "w-3/4"],
	["w-2/3", "w-1/2"],
	["w-1/3", "w-2/3"],
	["w-1/2", "w-1/2"],
	["w-2/3", "w-3/4"],
] as const;

export interface ListProps extends Closed {
	loading?: boolean;
	children?: ReactNode;
}

// Rows on the ground at the rows rhythm, with no box and no hairlines: a
// feed. A loading Section's body waits with it; the list says it is busy
// only on its own `loading`.
export function List({ loading, children }: ListProps) {
	const inherited = useContext(LoadingContext);
	const waiting = loading ?? inherited;
	const shape = useContext(LoadingRow);
	let rows: ReactNode = children;
	if (waiting && shape === "two-line-trailing")
		rows = TRAILING_BARS.map(([title, meta]) => (
			<View
				key={`${title} ${meta}`}
				className={cn(skeletonRow({ kind: "two-line-trailing" }), ROW_WAIT)}
			>
				<View className={LINES}>
					<View className={cn(ROW_TITLE_LINE, LINE)}>
						<View className={TITLE_SLOT}>
							<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
							<View className={cn(skeleton({ kind: "line" }), title)} />
						</View>
						<View
							className={cn(skeleton({ kind: "line" }), "w-1/4", TRAILING_WAIT)}
						/>
					</View>
					<View className={LINE}>
						<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
						<View className={cn(skeleton({ kind: "line" }), meta)} />
					</View>
				</View>
			</View>
		));
	else if (waiting)
		rows = BARS.map(([name, line]) => (
			<View
				key={`${name} ${line}`}
				className={cn(skeletonRow({ kind: "two-line" }), ROW_WAIT)}
			>
				<View className={cn(skeleton({ kind: "avatar" }), AVATAR_WAIT)} />
				<View className={cn(SKELETON_LINES, LINES_WAIT)}>
					<View className={cn(skeleton({ kind: "line" }), name)} />
					<View className={cn(skeleton({ kind: "line" }), line)} />
				</View>
			</View>
		));
	return (
		<View accessibilityState={{ busy: loading === true }} className={LIST}>
			{rows}
		</View>
	);
}
