import { cn } from "@fcalell/ui-core/cn";
import type { IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_TITLE,
	PAGE_TOP_BAR,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useEffect, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	BackRoute,
	Beside,
	CoverTabs,
	LendAct,
	type LentDetails,
	PageTitle,
} from "../../lib/frame.ts";
import { DEEPER, HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { navigate } from "../../lib/navigate.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Menu } from "../menu/index.tsx";
import { backGlyph, Details } from "../place/index.tsx";

// A screen is the size container a Split inside decides its regions by.
const SCREEN = "@container/page flex flex-col grow min-h-0";
// Beside a Split's main the screen is a region of its page: its head's acts
// read the page's width, and its body is the container.
const SCREEN_BESIDE = "flex flex-col grow min-h-0";
const BODY_BESIDE = "@container/page";
// Beside, the back act draws as Close to the same route from `wide` of the
// page, where the main stands with it.
const BACK = "flex page-wide:hidden";
const CLOSE = "flex page-max-wide:hidden";
const HEAD = "flex flex-col";
const ROW = "flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow truncate";
// The body fills the screen, so an EmptyState alone in it centres, and
// scrolls under the fixed head.
const BODY = "flex flex-col grow overflow-y-auto";

/** A pushed page. */
export interface ScreenProps extends Closed {
	/** The page's title, its one `h1`; beside a Split's main, a heading at the level where it stands. */
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

/** A page pushed over a place: the back act first and no filled act. Its head draws one hairline: on the desktop it stands in the shell's column under one strip; on touch the top bar (back, actions, more) stands over the title and the screen covers the tab bar. A Split inside decides its regions by the screen's width and lends it a Details act, drawn below `wide` of it. As a Split's `beside` record it stands in its page: its title is a heading at the level where it stands, it covers no tab bar, and from `wide` of the page its back act draws as Close. */
export function Screen({ title, back, actions, more, children }: ScreenProps) {
	const touch = useTouch();
	const words = useWords();
	const cover = use(CoverTabs);
	const beside = use(Beside);
	const level = use(HeadingContext);
	const [lent, lend] = useState<LentDetails>();
	const titleId = useId();
	useEffect(() => {
		if (!cover || beside) return;
		cover(true);
		return () => cover(false);
	}, [cover, beside]);
	const fit = touch ? "body" : "bar";
	const Heading = beside ? (`h${level}` as const) : "h1";
	const goBack =
		back === undefined ? null : (
			<IconButton
				icon={backGlyph(touch)}
				fit={fit}
				label={words.back}
				onAct={() => navigate(back)}
			/>
		);
	const close =
		back === undefined ? null : (
			<span className={CLOSE}>
				<IconButton
					icon="X"
					fit={fit}
					label={words.close}
					onAct={() => navigate(back)}
				/>
			</span>
		);
	const backAct = beside ? (
		<>
			{goBack ? <span className={BACK}>{goBack}</span> : null}
			{close}
		</>
	) : (
		goBack
	);
	const acts = (actions ?? []).map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const details = lent ? <Details {...lent} fit={fit} /> : null;
	const overflow = more?.length ? (
		<Menu label={words.more} items={more} />
	) : null;
	const heading = (
		<Heading
			id={titleId}
			className={cn(text({ role: "title" }), TITLE, touch && PAGE_TITLE)}
		>
			{title}
		</Heading>
	);
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts, their focus and an open sheet's trigger. Only the
	// title's place and the spacer differ, each a slot that holds `null` where
	// it does not draw, so the acts after it never shift.
	const head = (
		<header className={cn(PAGE_HEAD, HEAD)}>
			<div className={cn(PAGE_TOP_BAR, ROW)}>
				{backAct}
				{touch ? null : heading}
				{touch ? <span className={SPACER} /> : null}
				{acts}
				{details}
				{overflow}
			</div>
			{touch ? heading : null}
		</header>
	);
	return (
		<LendAct value={lend}>
			<BackRoute value={back}>
				<PageTitle value={titleId}>
					<HeadingContext value={beside ? DEEPER[level] : 2}>
						<div className={beside ? SCREEN_BESIDE : SCREEN}>
							{head}
							<div className={cn(PAGE_BODY, BODY, beside && BODY_BESIDE)}>
								{children}
							</div>
						</div>
					</HeadingContext>
				</PageTitle>
			</BackRoute>
		</LendAct>
	);
}
