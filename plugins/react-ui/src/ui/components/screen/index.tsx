import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import type { IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	PAGE_TOP_BAR_TOUCH,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useState } from "react";
import { backGlyph, LIST_BACK, LIST_BACK_REPLACED } from "../../lib/back.ts";
import type { Closed } from "../../lib/closed.ts";
import {
	ActRoom,
	BackRoute,
	Beside,
	DetailsSheet,
	PageTitle,
} from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButtonLink } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { headPaired } from "../item-header/pair.tsx";
import { Menu } from "../menu/index.tsx";
import { DETAILS, Details, ROW_MARKED } from "../place/index.tsx";
import { splitOf } from "../split/index.tsx";

// A screen is the size container a Split inside decides its regions by.
// A pushed screen marks its root `data-screen`: the Shell hides its tab bar
// while the mark stands in its column, from the first paint.
const SCREEN = "@container/page group/page flex flex-col grow min-h-0";
// Beside a Split's main the screen is a region of its page: its head's acts
// read the page's width, and its body's sections are the container. Where it
// stands alone (below `tablet` of the page) its body keeps the room of the
// act floating over it under its sections, as the main does.
const SCREEN_BESIDE = "flex flex-col grow min-h-0";
const SECTIONS_BESIDE = "@container/page flex flex-col shrink-0 grow";
const ALONE = "page-tablet:hidden";
// Beside, the back act draws as Close to the same route from `wide` of the
// page, where the main stands with it, at the head's end.
const BACK = "flex page-wide:hidden";
const CLOSE = "flex page-max-wide:hidden";
// Below `tablet` of the page the beside record's head stands alone, in the
// Place's stead, so it draws the Details act of the Split's pane.
const ALONE_ACT = "flex page-tablet:hidden";
const HEAD = "flex flex-col";
const ROW = "flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow truncate";
// The body fills the screen, so an EmptyState alone in it centres, and
// scrolls under the fixed head, taking a tab stop only while it scrolls with
// nothing tabbable inside.
const BODY =
	"flex flex-col grow overflow-y-auto focus-visible:-outline-offset-2";

/** A pushed page. */
export interface ScreenProps extends Closed {
	/** The page's title, an `h1` at every width, beside a Split's main too (a short phrase; truncates). */
	title: string;
	/** The route the back act returns to; none draws no back act. */
	back?: string;
	/** Icon acts after the title, in order. */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The page's sections. */
	children?: ReactNode;
}

/** A page pushed over a place: the back act first and no filled act. Its head draws one hairline: on the desktop it stands in the shell's column under one strip; on touch the top bar (back, actions, more) stands over the title and the screen covers the tab bar. A Split inside decides its regions by the screen's width and its pane's Details act stands in its head, drawn below `wide` of it; while its record stands alone (below `tablet`) the back act returns to the Split's `back` when it names one. As a Split's `beside` record it stands in its page: its title is an `h1` and its sections start at `h2` at every width; it covers no tab bar, and from `wide` of the page its back act draws as Close, the head's last act, so the title stands at the page's gutter. Below `tablet` of the page its head stands alone in the Place's stead, one top bar with its back act to the main, and draws the Details act of the Split's pane while it is open; its body keeps the room of the act floating over it. */
export function Screen({ title, back, actions, more, children }: ScreenProps) {
	const touch = useTouch();
	const words = useWords();
	const frame = use(Beside);
	const beside = frame !== null;
	const room = use(ActRoom);
	// A pushed screen holds the details sheet of a Split inside, as a Place
	// does; beside, the Place around holds it.
	const [own] = useState(() => Dialog.createHandle<unknown>());
	const sheet = (beside ? use(DetailsSheet) : null) ?? own;
	const titleId = useId();
	const [bodyNode, setBodyNode] = useState<HTMLDivElement | null>(null);
	const stop = useScrolls(bodyNode);
	const fit = touch ? "body" : "bar";
	// While a Split's record inside stands alone the back act returns to the
	// list: where the Split says it stands, else the screen's own `back`.
	const list = splitOf(children)?.back;
	const goBack =
		back === undefined ? null : (
			<IconButtonLink
				icon={backGlyph(touch)}
				fit={fit}
				label={words.back}
				href={back}
			/>
		);
	const goList =
		list === undefined ? null : (
			<IconButtonLink
				icon={backGlyph(touch)}
				fit={fit}
				label={words.back}
				href={list}
			/>
		);
	const close =
		back === undefined ? null : (
			<span className={CLOSE}>
				<IconButtonLink icon="X" fit={fit} label={words.close} href={back} />
			</span>
		);
	const standing = goList ? (
		<>
			{goBack ? <span className={LIST_BACK_REPLACED}>{goBack}</span> : null}
			<span className={LIST_BACK}>{goList}</span>
		</>
	) : (
		goBack
	);
	const backAct = beside
		? goBack && <span className={BACK}>{goBack}</span>
		: standing;
	const acts = (actions ?? []).map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const details = beside ? null : (
		<Details sheet={sheet} fit={fit} shown={DETAILS} />
	);
	const besideDetails = frame?.details ? (
		<Details sheet={frame.details} fit={fit} shown={ALONE_ACT} />
	) : null;
	const overflow = more?.length ? (
		<Menu label={words.more} items={more} />
	) : null;
	// On touch a top bar with nothing else in it stands only while the Split's marks show its back or Details act.
	const bar =
		!touch ||
		backAct !== null ||
		acts.length > 0 ||
		overflow !== null ||
		besideDetails !== null;
	const titleClass = cn(text({ role: "title" }), TITLE, touch && PAGE_TITLE);
	const heading = (
		<h1 id={titleId} className={titleClass}>
			{title}
		</h1>
	);
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts, their focus and an open sheet's trigger. Only the
	// title's place and the spacer differ, each a slot that holds `null` where
	// it does not draw, so the acts after it never shift.
	const head = (
		<header className={cn(PAGE_HEAD, HEAD)}>
			<div
				className={cn(
					PAGE_TOP_BAR,
					touch && PAGE_TOP_BAR_TOUCH,
					bar ? ROW : ROW_MARKED,
				)}
			>
				{backAct}
				{touch ? null : heading}
				{touch ? <span className={SPACER} /> : null}
				{acts}
				{details}
				{besideDetails}
				{overflow}
				{beside ? close : null}
			</div>
			{touch ? heading : null}
		</header>
	);
	return (
		<DetailsSheet value={sheet}>
			<BackRoute value={back}>
				<PageTitle value={titleId}>
					<HeadingContext value={2}>
						<div
							data-screen={beside ? undefined : ""}
							className={beside ? SCREEN_BESIDE : SCREEN}
						>
							{head}
							{beside ? (
								<div
									ref={setBodyNode}
									tabIndex={stop ? 0 : undefined}
									className={BODY}
								>
									<div className={cn(PAGE_BODY, SECTIONS_BESIDE)}>
										{headPaired(children)}
									</div>
									{room ? <div className={ALONE}>{room}</div> : null}
								</div>
							) : (
								<div
									ref={setBodyNode}
									tabIndex={stop ? 0 : undefined}
									className={cn(PAGE_BODY, BODY)}
								>
									{headPaired(children)}
								</div>
							)}
						</div>
					</HeadingContext>
				</PageTitle>
			</BackRoute>
		</DetailsSheet>
	);
}
