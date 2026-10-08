import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import { SHEET_DOCKED_BODY_SHARE } from "@fcalell/ui-core/tokens";
import {
	lineBox,
	SHEET_DOCKED_BODY,
	SHEET_DOCKED_FLOOR,
	SHEET_DOCKED_FOOT,
	SHEET_DOCKED_HEAD,
	SHEET_HEAD_ROW,
	THREAD_COLUMN,
	text,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	use,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { backGlyph } from "../../lib/back.ts";
import { focusFirst } from "../../lib/focus.ts";
import { FormStands } from "../../lib/form.ts";
import { FootPlace, FootRegion } from "../../lib/frame.ts";
import { useTouch } from "../../lib/media.ts";
import { ActFailed, ReasonKept } from "../../lib/reason.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import {
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ActionBar } from "../action-bar/index.tsx";
import { IconButton } from "../icon-button/index.tsx";

// The sheet fills its foot: the head and the foot keep their height and the
// body, bounded below, scrolls in what is left. The foot centres what it holds,
// so the sheet spans it.
const ROOT = "flex flex-col w-full min-h-0";
const HEAD = "flex items-start shrink-0";
const HEAD_MAIN = "flex flex-col grow min-w-0";
// The back and close acts stand at the title's first line: each in a box one
// heading line tall, centred on the line; a taller act overflows it centred.
const FIRST_LINE = "flex shrink-0 items-center h-lh";
const TITLE = "min-w-0 wrap-break-word";
// The body takes a tab stop only while it scrolls with nothing tabbable inside.
const BODY =
	"flex flex-col min-h-0 overflow-y-auto overscroll-contain focus-visible:-outline-offset-2";
const FOOT = "shrink-0";
const FOOT_ROW = "flex items-center justify-end";
const FOOT_STACK = "flex flex-col";
const FOOT_LINE = "grow min-w-0";

/** What a docked `Sheet` draws: the public `Sheet`'s props, standing in a foot. Outside the package's exports. */
export interface SheetDockedProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: Act;
	foot?: string;
	failed?: string;
	children?: ReactNode;
}

/** A `Sheet` standing in a Thread's or a Place's foot: no scrim, portal or dialog, the foot's raised cell its surface. The head holds the back act before one column, the title over the description, with the acts at the title's first line; the body scrolls between the head and the foot, which hold their height; the foot holds the line beside (over, on touch) the submit, and under the submit one kept line for a blocked reason or a failed run's sentence. Escape closes it, and each page opens at its top with focus in its first field. Closed it draws nothing. */
export function SheetDocked({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	foot,
	failed,
	children,
}: SheetDockedProps) {
	const touch = useTouch();
	const region = use(FootRegion);
	const words = useWords();
	const titleId = useId();
	const root = useRef<HTMLElement>(null);
	const [body, setBody] = useState<HTMLDivElement | null>(null);
	const stop = useScrolls(body);
	const [touchedValue, setTouched] = useTouchState();
	const page = usePageTurn(open, title, description, () => setTouched(false));
	// A new page opens at its top, not where the last one was scrolled to.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new page resets the scroll
	useLayoutEffect(() => {
		if (body) body.scrollTop = 0;
	}, [page, body]);
	// Each page takes focus in its first tabbable once it has settled (a radio
	// group sets its tab stop after the commit), whatever held it: an act that
	// relabels or leaves drops focus to the document, which a page with nothing
	// tabbable gives to the sheet's first one.
	// biome-ignore lint/correctness/useExhaustiveDependencies: a new page takes focus
	useEffect(() => {
		if (!open || !body) return;
		const frame = requestAnimationFrame(() => {
			focusFirst(body);
			if (document.activeElement === document.body) focusFirst(root.current);
		});
		return () => cancelAnimationFrame(frame);
	}, [open, page, body]);
	if (!open) return null;
	const iconFit = touch ? "body" : "bar";
	const line = foot ? (
		<p className={cn(text({ role: "meta" }), FOOT_LINE)}>{foot}</p>
	) : null;
	const bar = submit ? (
		<ReasonKept value>
			<ActFailed value={failed}>
				<ActionBar acts={[submit]} />
			</ActFailed>
		</ReasonKept>
	) : null;
	return (
		<TouchedContext value={touchedValue}>
			<section
				ref={root}
				aria-labelledby={titleId}
				onKeyDown={(event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					onClose();
				}}
				// A field inside takes input: a blocked act says its reason.
				onChange={touchedValue.touch}
				className={cn(!touch && THREAD_COLUMN, ROOT)}
			>
				<div className={cn(SHEET_HEAD_ROW, HEAD)}>
					{back ? (
						<div className={cn(lineBox({ role: "heading" }), FIRST_LINE)}>
							<IconButton
								icon={backGlyph(touch)}
								fit={iconFit}
								label={words.back}
								onAct={back}
							/>
						</div>
					) : null}
					<div className={cn(SHEET_DOCKED_HEAD, HEAD_MAIN)}>
						<h2 id={titleId} className={cn(text({ role: "heading" }), TITLE)}>
							{title}
						</h2>
						{description ? (
							<p className={text({ role: "meta" })}>{description}</p>
						) : null}
					</div>
					<div className={cn(lineBox({ role: "heading" }), FIRST_LINE)}>
						<IconButton
							icon="X"
							fit={iconFit}
							label={words.close}
							onAct={onClose}
						/>
					</div>
				</div>
				<div
					ref={setBody}
					tabIndex={stop ? 0 : undefined}
					style={
						region > 0
							? { maxHeight: SHEET_DOCKED_BODY_SHARE * region }
							: undefined
					}
					className={cn(
						SHEET_DOCKED_BODY,
						BODY,
						region > 0 && SHEET_DOCKED_FLOOR,
					)}
				>
					<FootPlace value={null}>
						<FormStands value="sheet">{children}</FormStands>
					</FootPlace>
				</div>
				{line || bar ? (
					<div
						className={cn(
							SHEET_DOCKED_FOOT,
							FOOT,
							touch ? FOOT_STACK : FOOT_ROW,
						)}
					>
						{line}
						{bar}
					</div>
				) : null}
			</section>
		</TouchedContext>
	);
}
