import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import {
	SPLIT_BESIDE,
	SPLIT_LIST,
	SPLIT_LIST_STACK,
	SPLIT_PANE,
	splitMain,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	ActRoom,
	Beside,
	DetailsSheet,
	OverThread,
	PageTitle,
	ThreadBleeds,
	ThreadRoom,
} from "../../lib/frame.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { useWords } from "../../lib/words.tsx";
import { SheetBase } from "../sheet/base.tsx";
import { MAIN_FILLED } from "../thread/fill.ts";

// The split fills its bleeding body; the list, the main and the pane each
// scroll on their own. Its page is the size container its regions query.
const SPLIT = "flex min-w-0 grow min-h-0";
// The list, the main and the pane each take a tab stop only while they scroll
// with nothing tabbable inside.
const LIST =
	"flex flex-col shrink-0 overflow-y-auto focus-visible:-outline-offset-2";
// Below `tablet` the list stands alone: the page's width under its own top
// inset, with no hairline.
const LIST_ALONE =
	"page-max-tablet:w-full page-max-tablet:pt-page page-max-tablet:pb-0 page-max-tablet:border-r-0";
// Below `tablet` one region stands: the open record, else the list.
const BEHIND = "page-max-tablet:hidden";
// The floating act's room under the record, kept only where the record
// stands alone; beside the list the act floats over the list alone.
const ALONE = "page-tablet:hidden";
// The main scrolls; its inset is its content's, so beside a record its own
// box is the half it shares and the inset counts against neither half.
const MAIN =
	"flex flex-col min-w-0 grow overflow-y-auto focus-visible:-outline-offset-2";
const MAIN_INSET = "flex flex-col shrink-0 grow";
// A Thread filling the main (its `data-fill` mark) scrolls its own log under
// the record's head, which stays put: the inset fits the main, which keeps the
// page inset around the head alone (`MAIN_FILLED`), so the main does not
// scroll.
const MAIN_FITS =
	"group/main [&:has(>[data-fill])]:shrink [&:has(>[data-fill])]:min-h-0";
// With a record beside it the main takes its half from `wide` and gives its
// place to that record below it.
const MAIN_SHARED = "basis-0 page-max-wide:hidden";
// The record beside the main scrolls in its own Screen body; from `wide` a
// hairline parts it from the main, below it the list's hairline is its edge.
const BESIDE = "flex flex-col min-w-0 border-edge page-wide:border-l";
const EMPTY = "flex grow min-w-0 items-center justify-center";
const PANE =
	"flex flex-col shrink-0 overflow-y-auto focus-visible:-outline-offset-2 page-max-wide:hidden";

/** A list beside the record it opens. */
export interface SplitProps extends Closed {
	/** The records, a `List`. */
	list?: ReactNode;
	/** The open record; none means nothing is open. */
	main?: ReactNode;
	/** A record the main opened, a `Screen` whose `back` is the main's route. */
	beside?: ReactNode;
	/** The open record's details. */
	pane?: ReactNode;
	/** What the main holds while nothing is open, an `EmptyState`. */
	empty?: ReactNode;
}

/** The list at its width inside a hairline beside the main, decided by its page's width: from `wide` the pane stands beside the main, below it the Details act its Place or Screen draws opens the pane as a sheet. Below `tablet` one region stands at a time: the list, or the open record, whose Place then leads its strip or top bar with a back act to the list. A record the main opened (`beside`) stands beside the main from `wide`, the two sharing what the list leaves, its back act drawn as Close and the pane behind the Details act at every width; below `wide` it stands in the main's place with its back act to the main, and below `tablet` its head stands alone, the Place drawing none. A Thread in the main fills it: the main stops scrolling, the record's head stays at the page inset over the Thread's log, which scrolls, and its input docks at the main's foot. It sits in a bleeding Place, whose strip heads it. */
export function Split({ list, main, beside, pane, empty }: SplitProps) {
	const words = useWords();
	const title = use(PageTitle);
	const room = use(ActRoom);
	const [open, setOpen] = useState(false);
	// The page around holds the sheet's handle, so its Details act stands from
	// its first frame.
	const [own] = useState(() => Dialog.createHandle<unknown>());
	const sheet = use(DetailsSheet) ?? own;
	const [listNode, setListNode] = useState<HTMLElement | null>(null);
	const [mainNode, setMainNode] = useState<HTMLElement | null>(null);
	const [paneNode, setPaneNode] = useState<HTMLElement | null>(null);
	const listStop = useScrolls(listNode, "y");
	const mainStop = useScrolls(mainNode, "y");
	const paneStop = useScrolls(paneNode, "y");
	const opened = main !== undefined;
	const detailed = opened && pane !== undefined;
	const besides = opened && beside !== undefined;
	const record = cn(MAIN, besides && MAIN_SHARED);
	const inset = cn(
		splitMain({ state: "rest" }),
		MAIN_FILLED,
		MAIN_INSET,
		MAIN_FITS,
	);
	return (
		<div
			data-split
			data-record={opened || undefined}
			data-pane={detailed || undefined}
			data-beside={besides || undefined}
			className={SPLIT}
		>
			<nav
				ref={setListNode}
				tabIndex={listStop ? 0 : undefined}
				aria-labelledby={title}
				className={cn(
					SPLIT_LIST,
					SPLIT_LIST_STACK,
					LIST,
					LIST_ALONE,
					opened && BEHIND,
				)}
			>
				{list}
				{room}
			</nav>
			{opened ? (
				<div
					ref={setMainNode}
					tabIndex={mainStop ? 0 : undefined}
					className={record}
				>
					<div className={inset}>
						<ThreadRoom value>
							<ThreadBleeds value>
								<OverThread value>{main}</OverThread>
							</ThreadBleeds>
						</ThreadRoom>
						{room ? <div className={ALONE}>{room}</div> : null}
					</div>
				</div>
			) : (
				<div className={cn(splitMain({ state: "empty" }), EMPTY, BEHIND)}>
					{empty}
				</div>
			)}
			{besides ? (
				<div className={cn(SPLIT_BESIDE, BESIDE)}>
					<Beside value={{ details: detailed ? sheet : undefined }}>
						{beside}
					</Beside>
				</div>
			) : null}
			{detailed && !besides ? (
				<aside
					ref={setPaneNode}
					tabIndex={paneStop ? 0 : undefined}
					aria-label={words.details}
					className={cn(SPLIT_PANE, PANE)}
				>
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
				{pane}
			</SheetBase>
		</div>
	);
}
