import { splitMain } from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useEffect, useState } from "react";
import type { Closed } from "../../lib/closed";
import { ActRoom, LendAct, PageTitle, RecordAlone } from "../../lib/frame";
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
	pane?: ReactNode;
	empty?: ReactNode;
}

// One region at a time, each scrolling itself in a bleeding Place: the list,
// or the open record once `main` is set, whose Place then leads its top bar
// with a back act to the list. With a record and a pane open, the
// Split lends a Details act to its Place or Screen, which opens the pane as a
// sheet. `empty` is the desktop's, so the phone never draws it.
export function Split({ list, main, pane }: SplitProps) {
	const words = useWords();
	const title = useContext(PageTitle);
	const lend = useContext(LendAct);
	const standAlone = useContext(RecordAlone);
	const room = useContext(ActRoom);
	const [open, setOpen] = useState(false);
	const opened = main !== undefined;
	const sheet = opened && pane !== undefined;
	useEffect(() => {
		if (!sheet || !lend) return;
		lend({
			icon: "PanelRight",
			label: words.details,
			onAct: () => setOpen(true),
		});
		return () => lend(undefined);
	}, [sheet, lend, words.details]);
	useEffect(() => {
		if (!opened || !standAlone) return;
		standAlone(true);
		return () => standAlone(false);
	}, [opened, standAlone]);
	return (
		<>
			{opened ? (
				<Scroll
					className={REGION}
					contentContainerClassName={splitMain({ state: "rest" })}
				>
					{main}
					{room}
				</Scroll>
			) : (
				<Scroll
					role="navigation"
					accessibilityLabel={title}
					className={REGION}
					contentContainerClassName={LIST}
				>
					{list}
					{room}
				</Scroll>
			)}
			<Sheet
				open={sheet && open}
				onClose={() => setOpen(false)}
				title={words.details}
			>
				{pane}
			</Sheet>
		</>
	);
}
