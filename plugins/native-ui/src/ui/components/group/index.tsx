import { groupWait } from "@fcalell/ui-core/list-state";
import {
	GROUP,
	lineBox,
	ROW_TITLE_LINE,
	skeleton,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import {
	Children,
	isValidElement,
	type ReactNode,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { between, GroupContext, type GroupHost } from "../../lib/group";
import { LoadingContext } from "../../lib/loading";

const BOX = "overflow-hidden";
// A waiting setting row stands in the loaded DefinitionRow's boxes: the
// label's line box beside the switch's hit box on the title line, the
// description's line box under it, each line's height set by a zero-width
// strut at its role, so each bar centres where its text does.
const ROW_WAIT = "flex-row items-center";
const LINES_WAIT = "flex-1 min-w-0";
const TITLE_WAIT = "flex-row items-center min-w-0";
const LABEL_WAIT = "flex-1 min-w-0 flex-row items-center";
const LINE_WAIT = "flex-row items-center";
const SWITCH_WAIT =
	"shrink-0 items-center justify-center min-h-target min-w-target";
const STRUT = "​";
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
						<View className={LINES_WAIT}>
							<View className={cn(ROW_TITLE_LINE, TITLE_WAIT)}>
								<View className={LABEL_WAIT}>
									<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
									<View className={cn(skeleton({ kind: "line" }), label)} />
								</View>
								<View className={SWITCH_WAIT}>
									<View className={skeleton({ kind: "switch" })} />
								</View>
							</View>
							<View className={LINE_WAIT}>
								<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
								<View className={cn(skeleton({ kind: "line" }), value)} />
							</View>
						</View>
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
							// Each wrapper keeps its row's own key (`Children.toArray`
							// keys a row by its place among the children as written,
							// so a conditional row appearing shifts no later row's
							// state); a keyless text stands at its index.
							<View
								key={isValidElement(row) && row.key !== null ? row.key : index}
								className={between(index)}
							>
								{row}
							</View>
						))}
					</GroundContext.Provider>
				</GroupContext.Provider>
			</LoadingContext.Provider>
		</View>
	);
}
