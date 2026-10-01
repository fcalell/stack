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
import { LendAct, PageTitle } from "../../lib/frame.ts";
import { useAtLeast } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useWords } from "../../lib/words.tsx";

const SPLIT = "flex min-w-0 grow";
const LIST = "flex flex-col shrink-0";
const MAIN = "flex flex-col min-w-0 grow";
// On touch the record sits under the bleeding Place's top inset, one inset
// under the title, so it draws none of its own.
const RECORD = "touch:pt-0";
const EMPTY = "flex grow min-w-0 items-center justify-center";
const PANE = "flex flex-col shrink-0";
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

/** The list at its width inside a hairline beside the main; at `wide` the pane stands beside the main, below it the Split lends a Details act to its Place or Screen that opens the pane as a sheet. Below `tablet` one region stands at a time: the list, or the open record. It sits in a bleeding Place, whose strip heads it. */
export function Split({ list, main, pane, empty }: SplitProps) {
	const words = useWords();
	const tablet = useAtLeast("tablet");
	const wide = useAtLeast("wide");
	const title = use(PageTitle);
	const lend = use(LendAct);
	const container = use(PortalContainer);
	const [open, setOpen] = useState(false);
	const opened = main !== undefined;
	const sheet = !wide && opened && pane !== undefined;
	useEffect(() => {
		if (!sheet || !lend) return;
		lend({
			icon: "PanelRight",
			label: words.details,
			onAct: () => setOpen(true),
		});
		return () => lend(undefined);
	}, [sheet, lend, words.details]);
	const record = (
		<div className={cn(splitMain({ state: "rest" }), MAIN, RECORD)}>{main}</div>
	);
	const alone = opened ? (
		record
	) : (
		<nav aria-labelledby={title} className={MAIN}>
			{list}
		</nav>
	);
	const beside = opened ? (
		record
	) : (
		<div className={cn(splitMain({ state: "empty" }), EMPTY)}>{empty}</div>
	);
	return (
		<div className={SPLIT}>
			{tablet ? (
				<>
					<nav aria-labelledby={title} className={cn(SPLIT_LIST, LIST)}>
						{list}
					</nav>
					{beside}
					{wide && opened && pane !== undefined ? (
						<aside aria-label={words.details} className={cn(SPLIT_PANE, PANE)}>
							{pane}
						</aside>
					) : null}
				</>
			) : (
				alone
			)}
			<Dialog.Root open={sheet && open} onOpenChange={setOpen}>
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
