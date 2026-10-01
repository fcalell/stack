import {
	GROUP,
	HAIRLINE,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { Children, type ReactNode, useContext } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingContext } from "../../lib/loading";

const BOX = "overflow-hidden";
// `GROUP`'s `divide-*` is a child selector uniwind drops, so the group draws
// the hairline itself, on its own wrapper above every row after the first.
const BETWEEN = "border-t";
const ROW_WAIT = "flex-row items-center";
const LINES_WAIT = "grow min-w-0";
const SWITCH_WAIT = "shrink-0";
// The loading rows' bars, a label over a value, each at the length of the
// line it stands in for.
const BARS = [
	["w-1/3", "w-1/4"],
	["w-1/4", "w-1/4"],
	["w-1/3", "w-1/2"],
] as const;

export interface GroupProps extends Closed {
	loading?: boolean;
	children?: ReactNode;
}

// Rows in a hairline card on the surface, the hairline drawn once between
// them, so no row carries one. A loading Section's body waits with it; the
// group says it is busy only on its own `loading`.
export function Group({ loading, children }: GroupProps) {
	const inherited = useContext(LoadingContext);
	const waiting = loading ?? inherited;
	const rows = waiting
		? BARS.map(([label, value]) => (
				<View
					key={`${label} ${value}`}
					className={cn(skeletonRow({ kind: "setting" }), ROW_WAIT)}
				>
					<View className={cn(SKELETON_LINES, LINES_WAIT)}>
						<View className={cn(skeleton({ kind: "line" }), label)} />
						<View className={cn(skeleton({ kind: "line" }), value)} />
					</View>
					<View className={cn(skeleton({ kind: "switch" }), SWITCH_WAIT)} />
				</View>
			))
		: Children.toArray(children);
	return (
		<View
			accessibilityState={{ busy: loading === true }}
			className={cn(GROUP, BOX)}
		>
			{rows.map((row, index) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reorder
					key={index}
					className={cn(index > 0 && BETWEEN, index > 0 && HAIRLINE)}
				>
					{row}
				</View>
			))}
		</View>
	);
}
