import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import { SPLIT_LIST, SPLIT_PANE, splitMain } from "@fcalell/ui-core/variants";
import { type ReactNode, use, useEffect, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	ActRoom,
	LendAct,
	PageTitle,
	RecordOpen,
	ThreadBleeds,
	ThreadFills,
} from "../../lib/frame.ts";
import { useWords } from "../../lib/words.tsx";
import { SheetBase } from "../sheet/base.tsx";

// The split fills its bleeding body; the list, the main and the pane each
// scroll on their own. Its page is the size container its regions query.
const SPLIT = "flex min-w-0 grow min-h-0";
const LIST = "flex flex-col shrink-0 overflow-y-auto";
// Below `tablet` the list stands alone: the page's width under its own top
// inset, with no hairline.
const LIST_ALONE =
	"page-max-tablet:w-full page-max-tablet:pt-page page-max-tablet:pb-0 page-max-tablet:border-r-0";
// Below `tablet` one region stands: the open record, else the list.
const BEHIND = "page-max-tablet:hidden";
// The floating act's room under the record, kept only where the record
// stands alone; beside the list the act floats over the list alone.
const ALONE = "page-tablet:hidden";
const MAIN = "flex flex-col min-w-0 grow overflow-y-auto";
// A Thread filling the main scrolls its own log under the record's head,
// which stays put, so the main does not scroll.
const MAIN_FILLED = "flex flex-col min-w-0 grow";
const EMPTY = "flex grow min-w-0 items-center justify-center";
const PANE = "flex flex-col shrink-0 overflow-y-auto page-max-wide:hidden";
// The pane opened below `wide` is a side sheet at the pane's fit, its
// sections a sections rhythm apart.
const PANE_SHEET = "flex flex-col gap-sections";

/** A list beside the record it opens. */
export interface SplitProps extends Closed {
	/** The records, a `List`. */
	list?: ReactNode;
	/** The open record; none means nothing is open. */
	main?: ReactNode;
	/** The open record's details. */
	pane?: ReactNode;
	/** What the main holds while nothing is open, an `EmptyState`. */
	empty?: ReactNode;
}

/** The list at its width inside a hairline beside the main, decided by its page's width: from `wide` the pane stands beside the main, below it the Split lends its Place or Screen a Details act that opens the pane as a sheet. Below `tablet` one region stands at a time: the list, or the open record, whose Place then leads its strip or top bar with a back act to the list. A Thread in the main fills it: the main stops scrolling, the record's head stays at the page inset over the Thread's log, which scrolls, and its input docks at the main's foot. It sits in a bleeding Place, whose strip heads it. */
export function Split({ list, main, pane, empty }: SplitProps) {
	const words = useWords();
	const title = use(PageTitle);
	const lend = use(LendAct);
	const recordOpen = use(RecordOpen);
	const room = use(ActRoom);
	const [open, setOpen] = useState(false);
	const [fills, setFills] = useState(false);
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	const opened = main !== undefined;
	const detailed = opened && pane !== undefined;
	useEffect(() => {
		if (!detailed || !lend) return;
		lend(sheet);
		return () => lend(undefined);
	}, [detailed, lend, sheet]);
	useEffect(() => {
		if (!opened || !recordOpen) return;
		recordOpen(true);
		return () => recordOpen(false);
	}, [opened, recordOpen]);
	const record = fills
		? cn(splitMain({ state: "fills" }), MAIN_FILLED)
		: cn(splitMain({ state: "rest" }), MAIN);
	return (
		<div data-split className={SPLIT}>
			<nav
				aria-labelledby={title}
				className={cn(SPLIT_LIST, LIST, LIST_ALONE, opened && BEHIND)}
			>
				{list}
				{room}
			</nav>
			{opened ? (
				<div className={record}>
					<ThreadFills value={setFills}>
						<ThreadBleeds value>{main}</ThreadBleeds>
					</ThreadFills>
					{room ? <div className={ALONE}>{room}</div> : null}
				</div>
			) : (
				<div className={cn(splitMain({ state: "empty" }), EMPTY, BEHIND)}>
					{empty}
				</div>
			)}
			{detailed ? (
				<aside aria-label={words.details} className={cn(SPLIT_PANE, PANE)}>
					{pane}
				</aside>
			) : null}
			<SheetBase
				handle={sheet}
				open={detailed && open}
				onOpen={() => setOpen(true)}
				onClose={() => setOpen(false)}
				title={words.details}
				fit="pane"
			>
				<div className={PANE_SHEET}>{pane}</div>
			</SheetBase>
		</div>
	);
}
