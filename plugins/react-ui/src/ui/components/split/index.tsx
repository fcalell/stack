import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import {
	SCRIM,
	SHELL_COLUMN,
	SPLIT_LIST,
	SPLIT_PANE,
	splitMain,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useEffect, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { ActRoom, LendAct, PageTitle, RecordOpen } from "../../lib/frame.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useWords } from "../../lib/words.tsx";

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
const EMPTY = "flex grow min-w-0 items-center justify-center";
const PANE = "flex flex-col shrink-0 overflow-y-auto page-max-wide:hidden";
// The pane opened below `wide`: the pane's own strings over the column's
// ground, standing at the viewport's end over the scrim.
const BACKDROP = "fixed inset-0";
const SHEET =
	"fixed inset-y-0 right-0 flex flex-col overflow-y-auto overscroll-contain";

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

/** The list at its width inside a hairline beside the main, decided by its page's width: from `wide` the pane stands beside the main, below it the Split lends its Place or Screen a Details act that opens the pane as a sheet. Below `tablet` one region stands at a time: the list, or the open record, whose Place then leads its strip or top bar with a back act to the list. It sits in a bleeding Place, whose strip heads it. */
export function Split({ list, main, pane, empty }: SplitProps) {
	const words = useWords();
	const title = use(PageTitle);
	const lend = use(LendAct);
	const recordOpen = use(RecordOpen);
	const container = use(PortalContainer);
	const room = use(ActRoom);
	const [open, setOpen] = useState(false);
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
				<div className={cn(splitMain({ state: "rest" }), MAIN)}>
					{main}
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
			<Dialog.Root
				handle={sheet}
				open={detailed && open}
				onOpenChange={setOpen}
			>
				<Dialog.Portal container={container}>
					<Dialog.Backdrop className={cn(SCRIM, BACKDROP)} />
					<Dialog.Popup
						aria-label={words.details}
						className={cn(SPLIT_PANE, SHELL_COLUMN, SHEET)}
					>
						{pane}
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
