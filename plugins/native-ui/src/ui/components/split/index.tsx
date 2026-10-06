import type { IconAct } from "@fcalell/ui-core/descriptors";
import {
	SPLIT_BESIDE,
	SPLIT_LIST_STACK,
	splitMain,
} from "@fcalell/ui-core/variants";
import {
	Children,
	isValidElement,
	type ReactNode,
	useContext,
	useState,
} from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ActRoom,
	BackRoute,
	Beside,
	DetailsOpen,
	type DetailsState,
	PageTitle,
	ThreadBleeds,
	ThreadRoom,
} from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
import type { Route } from "../../lib/route";
import { useWords } from "../../lib/words";
import { Sheet } from "../sheet";
import { holdsThread } from "../thread";

const REGION = "flex-1";
// Whatever stands first in a bleeding body carries its own top inset: the
// record its cell's, the list `SPLIT_LIST_STACK`'s, and the page inset
// sideways, which its bleeding rows meet the title across.
const LIST = "px-page";

export interface SplitProps extends Closed {
	list?: ReactNode;
	main?: ReactNode;
	beside?: ReactNode;
	pane?: ReactNode;
	empty?: ReactNode;
	back?: Route;
}

// One region at a time, each scrolling itself in a bleeding Place: the list,
// or the open record once `main` is set, whose Place then leads its top bar
// with a back act to the list. A Thread in the record (as `main`, or in a
// fragment under the record's head) fills it: the record stops scrolling, its
// scroll kept so nothing in it remounts, its head stays at the page inset over the Thread's log, which scrolls, and the
// input docks at its foot. A record the main opened (`beside`, a Screen)
// replaces the main, its head the page's one (the Place draws none) with its
// back act to the main and the Details act in its top bar. With a record
// and a pane open, its Place or Screen draws a Details act that opens the pane
// as a sheet. It stands as its page's direct child, where the page reads its
// props (`useSplitHead`); deeper it draws as a plain region and no head draws its
// acts. `empty` is the desktop's, so the phone never draws it. `back` is the
// route where the list stands alone: the record's back act returns to it, in
// a Place and in a pushed Screen, and so does a missing read in its regions,
// in the place's route's and the Screen's `back`'s stead.
export function Split({ list, main, beside, pane, back }: SplitProps) {
	const words = useWords();
	const title = useContext(PageTitle);
	// The regions lead back to the list's route, outranking the route the
	// Screen around leads back to; unset, they keep the one they stand under.
	const outer = useContext(BackRoute);
	const held = useContext(DetailsOpen);
	const room = useContext(ActRoom);
	const [own, setOwn] = useState(false);
	const open = held ? held.open : own;
	const setOpen = held ? held.setOpen : setOwn;
	const opened = main !== undefined;
	const sheet = opened && pane !== undefined;
	// The Details sheet belongs to the pane it opened on: with no pane it
	// closes, so the next record's opens only on its own Details act.
	if (own && !sheet) setOwn(false);
	const besides = opened && beside !== undefined;
	const details: IconAct | undefined = sheet
		? { icon: "PanelRight", label: words.details, onAct: () => setOpen(true) }
		: undefined;
	// A Thread in the record fills it, read off `main` in render.
	const fill = holdsThread(main);
	let region: ReactNode = (
		<Scroll
			key="list"
			role="navigation"
			accessibilityLabel={title}
			className={REGION}
			contentContainerClassName={cn(SPLIT_LIST_STACK, LIST)}
		>
			{list}
			{room}
		</Scroll>
	);
	if (besides)
		region = (
			<View className={SPLIT_BESIDE}>
				<Beside.Provider value={{ details }}>{beside}</Beside.Provider>
			</View>
		);
	else if (opened)
		region = (
			<Scroll
				key="record"
				enabled={!fill}
				scrollEnabled={!fill}
				className={REGION}
				contentContainerClassName={
					fill
						? cn(splitMain({ state: "fills" }), REGION)
						: splitMain({ state: "rest" })
				}
			>
				<ThreadRoom.Provider value={fill}>
					<ThreadBleeds.Provider value>{main}</ThreadBleeds.Provider>
				</ThreadRoom.Provider>
				{room}
			</Scroll>
		);
	return (
		<BackRoute.Provider value={back ?? outer}>
			{region}
			<Sheet
				fit="pane"
				open={sheet && open}
				onClose={() => setOpen(false)}
				title={words.details}
			>
				{pane}
			</Sheet>
		</BackRoute.Provider>
	);
}

// What a page's head shows of the Split standing as its direct child, read
// off the Split's props in render: whether its record stands alone, has a
// pane, or has a record standing beside it, the route its list stands at
// (`back`), and the Details act that opens the pane, whose open state the
// page holds (`DetailsOpen`, `null` with no Split there).
export function useSplitHead(children: ReactNode) {
	const words = useWords();
	const [open, setOpen] = useState(false);
	const split = Children.toArray(children).find(
		(child) => isValidElement<SplitProps>(child) && child.type === Split,
	);
	const props = isValidElement<SplitProps>(split) ? split.props : undefined;
	const record = props?.main !== undefined;
	const pane = record && props?.pane !== undefined;
	const beside = record && props?.beside !== undefined;
	// The sheet belongs to the pane it opened on: with no pane it closes.
	if (open && !pane) setOpen(false);
	const details: IconAct | undefined =
		pane && !beside
			? { icon: "PanelRight", label: words.details, onAct: () => setOpen(true) }
			: undefined;
	const held: DetailsState | null = props ? { open, setOpen } : null;
	// A Thread filling the record holds the page's toasts over its own input.
	const thread = record && !beside && holdsThread(props?.main);
	return { record, beside, details, held, thread, back: props?.back };
}
