import {
	LIST,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingContext } from "../../lib/loading";

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
	return (
		<View accessibilityState={{ busy: loading === true }} className={LIST}>
			{waiting
				? BARS.map(([name, line]) => (
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
					))
				: children}
		</View>
	);
}
