import type { IconAct } from "@fcalell/ui-core/descriptors";
import { SPLIT_BESIDE, splitMain } from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ActRoom,
	Beside,
	BesideOpen,
	LendAct,
	PageTitle,
	RecordAlone,
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
// and a pane open, the Split lends a Details act to its Place or Screen, which
// opens the pane as a sheet. `empty` is the desktop's, so the phone never
// draws it.
export function Split({ list, main, beside, pane }: SplitProps) {
	const words = useWords();
	const title = useContext(PageTitle);
	const lend = useContext(LendAct);
	const standAlone = useContext(RecordAlone);
	const besideOpen = useContext(BesideOpen);
	const room = useContext(ActRoom);
	const [open, setOpen] = useState(false);
	const [fills, setFills] = useState(false);
	const opened = main !== undefined;
	const sheet = opened && pane !== undefined;
	const besides = opened && beside !== undefined;
	const details: IconAct | undefined = sheet
		? { icon: "PanelRight", label: words.details, onAct: () => setOpen(true) }
		: undefined;
	// The Details act stands in the head the page shows: the Place's, or the
	// beside record's, which then stands alone.
	useEffect(() => {
		if (!sheet || besides || !lend) return;
		lend({
			icon: "PanelRight",
			label: words.details,
			onAct: () => setOpen(true),
		});
		return () => lend(undefined);
	}, [sheet, besides, lend, words.details]);
	useEffect(() => {
		if (!besides || !besideOpen) return;
		besideOpen(true);
		return () => besideOpen(false);
	}, [besides, besideOpen]);
	useEffect(() => {
		if (!opened || !standAlone) return;
		standAlone(true);
		return () => standAlone(false);
	}, [opened, standAlone]);
	const record = (
		<ThreadFills.Provider value={setFills}>
			<ThreadBleeds.Provider value>{main}</ThreadBleeds.Provider>
		</ThreadFills.Provider>
	);
	let region: ReactNode = (
		<Scroll
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
