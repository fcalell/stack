import type { ProcedureCall } from "@fcalell/plugin-api/types";
import { cn } from "@fcalell/ui-core/cn";
import { BACK_GLYPH } from "@fcalell/ui-core/list-state";
import { dockedBodyMax } from "@fcalell/ui-core/tokens";
import {
	BLOCK_IN,
	lineBox,
	SHEET_DOCKED_BODY,
	SHEET_DOCKED_FLOOR,
	SHEET_DOCKED_FOOT,
	SHEET_DOCKED_HEAD,
	SHEET_HEAD_ROW,
	text,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { Act } from "../../lib/act.ts";
import { useAct } from "../../lib/act.ts";
import { SectionTitle } from "../../lib/field.ts";
import { focusFirst } from "../../lib/focus.ts";
import type { FootRegionValue } from "../../lib/frame.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import {
	TouchedContext,
	usePageTurn,
	useTouchState,
} from "../../lib/touched.ts";
import { Scroller, useScroller } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import { Button } from "../button/index.tsx";
import { FormBody } from "../form/base.tsx";
import { type FormProps, useDerivedForm } from "../form/index.tsx";
import { DIVIDER } from "../section/card.tsx";

// The sheet fills its foot: the head and the foot keep their height and the
// body, bounded below, scrolls in what is left. The foot centres what it holds,
// so the sheet spans it.
const ROOT = "flex flex-col w-full min-h-0";
const HEAD = "flex items-start shrink-0";
const HEAD_MAIN = "flex flex-col grow min-w-0";
// The back and close acts stand at the title's first line: each in a box one
// heading line tall, centred on the line; a taller act overflows it centred.
const FIRST_LINE = "flex shrink-0 items-center h-lh";
const TITLE = "min-w-0";
// The body takes a tab stop only while it scrolls with nothing tabbable inside.
// Its three-row floor is on the content it scrolls, so the body itself yields
// below it where the region is short.
const BODY =
	"min-h-0 overflow-y-auto overscroll-contain focus-visible:-outline-offset-2";
const CONTENT = "flex flex-col";
const FOOT = "shrink-0";
const FOOT_ROW =
	"flex items-center justify-end touch:flex-col touch:items-stretch";
// On the desktop the sheet stands within the thread's column, as the field does.
const COLUMN = "max-w-measure touch:max-w-none";

/** What a docked `Sheet` draws: the public `Sheet`'s props, standing in a foot, and the foot's measured `region`. Outside the package's exports: a `Pane` and a `Thread` draw it for their `sheet`. */
export interface SheetDockedProps<P extends ProcedureCall = ProcedureCall> {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: Act;
	form?: FormProps<P>;
	/** The foot's region, which bounds the body. */
	region: FootRegionValue;
	/** The body's parts, ahead of the `form`. */
	children?: ReactNode;
}

/** A `Sheet` a Thread or a Pane draws in its foot: no scrim, portal or dialog, the foot's raised cell its surface. The head holds the back act before one column, the title over the description, with the acts at the title's first line; the body scrolls between the head and the foot, which hold their height; the foot holds the submit, and under it one kept line for a blocked reason or a failed run's sentence. Escape closes it, and each page opens at its top with focus in its first field. Closed it draws nothing. */
export function SheetDocked<P extends ProcedureCall>({
	open,
	onClose,
	title,
	description,
	back,
	submit,
	form,
	region,
	children,
}: SheetDockedProps<P>) {
	// The sheet docks as a block: it fades in on `base` and the body above takes
	// its new height; closing it runs in the page's block move, so it fades out on
	// `fast` as the body takes the room back.
	// The foot's act and its form's bar share one run: one act pends at a time,
	// and closing is held while it runs.
	const acting = useAct<number>("line");
	const derived = useDerivedForm(form, open);
	const words = useWords();
	const titleId = useId();
	const root = useRef<HTMLElement>(null);
	const scroll = useScroller();
	const body = scroll.node;
	// What the sheet pins besides its body (its head and foot) and the body's
	// floor, measured off the sheet.
	const [pinned, setPinned] = useState({ parts: 0, floor: 0 });
	useScrolls(body);
	const [touchedValue, setTouched] = useTouchState();
	const page = usePageTurn(open, title, description, () => setTouched(false));
	useLayoutEffect(() => {
		const sheet = root.current;
		if (!sheet || !body) return;
		const measure = () => {
			const parts = Math.round(
				sheet.getBoundingClientRect().height -
					body.getBoundingClientRect().height,
			);
			const floor = Number.parseFloat(
				getComputedStyle(sheet).getPropertyValue("--spacing-docked-floor"),
			);
			setPinned((last) =>
				last.parts === parts && last.floor === floor ? last : { parts, floor },
			);
		};
		measure();
		const resize = new ResizeObserver(measure);
		resize.observe(sheet);
		resize.observe(body);
		return () => resize.disconnect();
	}, [body]);
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
	const maxHeight =
		region.height > 0
			? dockedBodyMax({
					region: region.height,
					pinned: region.chrome + pinned.parts,
					floor: pinned.floor,
					logFloor: region.logFloor,
				})
			: undefined;
	const bar = submit ? (
		<ActionBarBase acts={[submit]} acting={acting} kept />
	) : null;
	const close = () => {
		if (!acting.holds) onClose();
	};
	return (
		<TouchedContext value={touchedValue}>
			<section
				ref={root}
				aria-labelledby={titleId}
				onKeyDown={(event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					close();
				}}
				// A field inside takes input: a blocked act says its reason.
				onChange={touchedValue.touch}
				className={cn(COLUMN, ROOT, BLOCK_IN)}
			>
				<div className={cn(SHEET_HEAD_ROW, HEAD)}>
					{back ? (
						<div className={cn(lineBox({ role: "heading" }), FIRST_LINE)}>
							<Button glyph icon={BACK_GLYPH} label={words.back} onAct={back} />
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
						<Button glyph icon="X" label={words.close} onAct={close} />
					</div>
				</div>
				{/* A new page is a new scroller, open at its top, not where the last one was scrolled to. */}
				<div
					key={page}
					ref={scroll.ref}
					style={maxHeight === undefined ? undefined : { maxHeight }}
					className={BODY}
				>
					<div
						className={cn(
							CONTENT,
							DIVIDER,
							region.height > 0 && SHEET_DOCKED_FLOOR,
						)}
					>
						<Scroller value={scroll}>
							{children ? (
								<div className={cn(SHEET_DOCKED_BODY, CONTENT)}>
									{/* A control placed alone here draws its field, whatever Section the sheet docks under. */}
									<SectionTitle value={undefined}>{children}</SectionTitle>
								</div>
							) : null}
							{derived ? (
								<FormBody
									{...derived.frame}
									in="sheet"
									acting={acting}
									outer={derived.outer}
								/>
							) : null}
						</Scroller>
					</div>
				</div>
				{bar ? (
					<div className={cn(SHEET_DOCKED_FOOT, FOOT, FOOT_ROW)}>{bar}</div>
				) : null}
			</section>
		</TouchedContext>
	);
}
