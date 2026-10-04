import type { IconAct } from "@fcalell/ui-core/descriptors";
import { SPLIT_BESIDE, splitMain } from "@fcalell/ui-core/variants";
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
	Beside,
	DetailsOpen,
	type DetailsState,
	PageTitle,
	ThreadBleeds,
	ThreadFills,
} from "../../lib/frame";
import { Scroll } from "../../lib/hosts";
import { useWords } from "../../lib/words";
import { Sheet } from "../sheet";

const REGION = "flex-1";
// Whatever stands first in a bleeding body carries its own top inset: the
// record its cell's, the list alone the page inset, sideways too, which its
// bleeding rows meet the title across.
const LIST = "pt-page px-page";

export interface SplitProps extends Closed {
	list?: ReactNode;
	main?: ReactNode;
	beside?: ReactNode;
	pane?: ReactNode;
	empty?: ReactNode;
}

// One region at a time, each scrolling itself in a bleeding Place: the list,
// or the open record once `main` is set, whose Place then leads its top bar
// with a back act to the list. A Thread in the record fills it: the record
// stops scrolling (its first frame remounts it out of the scroll), its head
// stays at the page inset over the Thread's log, which scrolls, and the
// input docks at its foot. A record the main opened (`beside`, a Screen)
// replaces the main, its head the page's one (the Place draws none) with its
// back act to the main and the Details act in its top bar. With a record
// and a pane open, its Place or Screen draws a Details act that opens the pane
// as a sheet. It stands as its page's direct child, where the page reads its
// props (`useSplitHead`); deeper it draws as a plain region and no head draws its
// acts. `empty` is the desktop's, so the phone never draws it.
export function Split({ list, main, beside, pane }: SplitProps) {
	const words = useWords();
	const title = useContext(PageTitle);
	const held = useContext(DetailsOpen);
	const room = useContext(ActRoom);
	const [own, setOwn] = useState(false);
	const open = held ? held.open : own;
	const setOpen = held ? held.setOpen : setOwn;
	const [fills, setFills] = useState(false);
	const opened = main !== undefined;
	const sheet = opened && pane !== undefined;
	// The Details sheet belongs to the pane it opened on: with no pane it
	// closes, so the next record's opens only on its own Details act.
	if (own && !sheet) setOwn(false);
	const besides = opened && beside !== undefined;
	const details: IconAct | undefined = sheet
		? { icon: "PanelRight", label: words.details, onAct: () => setOpen(true) }
		: undefined;
	const record = (
		<ThreadFills.Provider value={setFills}>
			<ThreadBleeds.Provider value>{main}</ThreadBleeds.Provider>
		</ThreadFills.Provider>
	);
	let region: ReactNode = (
		<Scroll
			key="list"
			role="navigation"
			accessibilityLabel={title}
			className={REGION}
			contentContainerClassName={LIST}
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
	else if (opened && fills)
		region = (
			<View className={cn(splitMain({ state: "fills" }), REGION)}>
				{record}
				{room}
			</View>
		);
	else if (opened)
		region = (
			<Scroll
				key="record"
				className={REGION}
				contentContainerClassName={splitMain({ state: "rest" })}
			>
				{record}
				{room}
			</Scroll>
		);
	return (
		<>
			{region}
			<Sheet
				fit="pane"
				open={sheet && open}
				onClose={() => setOpen(false)}
				title={words.details}
			>
				{pane}
			</Sheet>
		</>
	);
}

// What a page's head shows of the Split standing as its direct child, read
// off the Split's props in render: whether its record stands alone, has a
// pane, or has a record standing beside it, and the Details act that opens
// the pane, whose open state the page holds (`DetailsOpen`, `null` with no
// Split there).
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
	return { record, beside, details, held };
}
