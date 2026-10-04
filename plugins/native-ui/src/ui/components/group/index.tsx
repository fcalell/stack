import { groupWait } from "@fcalell/ui-core/list-state";
import {
	GROUP,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import {
	Children,
	type ReactNode,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { between, GroupContext, type GroupHost } from "../../lib/group";
import { LoadingContext } from "../../lib/loading";
import { useSectionRows } from "../../lib/section";

const BOX = "overflow-hidden";
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
// them, so no row carries one. A List in it draws its rows, its waiting rows
// and its failed and empty forms on the card, the card busy while the
// List's items wait. A loading Section's body waits with it: a List draws
// its own waiting rows, and skeleton setting rows stand in for static rows;
// the group says it is busy only on its own `loading` or a busy List.
export function Group({ loading, children }: GroupProps) {
	useSectionRows();
	const inherited = useContext(LoadingContext);
	const waiting = loading ?? inherited;
	// A waiting body draws a List's own waiting rows when one (however deep)
	// registers; with none, setting skeletons. The body renders once to learn,
	// and the swap lands in a synchronous re-render before paint.
	const lists = useRef(0);
	const [busyLists, setBusyLists] = useState(0);
	const [settings, setSettings] = useState(false);
	const host = useMemo<GroupHost>(
		() => ({
			list: (busy) => {
				lists.current += 1;
				if (busy) setBusyLists((count) => count + 1);
				return () => {
					lists.current -= 1;
					if (busy) setBusyLists((count) => count - 1);
				};
			},
		}),
		[],
	);
	useLayoutEffect(() => {
		setSettings(waiting && groupWait(lists.current) === "settings");
	}, [waiting]);
	const rows =
		waiting && settings
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
			accessibilityState={{ busy: loading === true || busyLists > 0 }}
			className={cn(GROUP, BOX)}
		>
			<LoadingContext.Provider value={waiting}>
				<GroupContext.Provider value={host}>
					<GroundContext.Provider value="group">
						{rows.map((row, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reorder
							<View key={index} className={between(index)}>
								{row}
							</View>
						))}
					</GroundContext.Provider>
				</GroupContext.Provider>
			</LoadingContext.Provider>
		</View>
	);
}
