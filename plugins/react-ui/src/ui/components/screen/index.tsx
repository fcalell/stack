import type { Dialog } from "@base-ui/react/dialog";
import { cn } from "@fcalell/ui-core/cn";
import type { IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_STRIP,
	PAGE_TOP_BAR,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useEffect, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { CoverTabs, LendAct, PageTitle } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { navigate } from "../../lib/navigate.ts";
import { useWords } from "../../lib/words.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Menu } from "../menu/index.tsx";
import { backGlyph, Details } from "../place/index.tsx";

// A screen is the size container a Split inside decides its regions by.
const SCREEN = "@container/page flex flex-col grow min-h-0";
const HEAD = "flex flex-col";
const ROW = "flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow truncate";
// The body fills the screen, so an EmptyState alone in it centres, and
// scrolls under the fixed head.
const BODY = "flex flex-col grow overflow-y-auto";

/** A pushed page. */
export interface ScreenProps extends Closed {
	/** The page's title, its one `h1`. */
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

/** A page pushed over a place: the back act first and no filled act. On the desktop it stands in the shell's column under one strip; on touch the top bar (back, actions, more) stands over the title and the screen covers the tab bar. A Split inside decides its regions by the screen's width and lends it a Details act, drawn below `wide` of it. */
export function Screen({ title, back, actions, more, children }: ScreenProps) {
	const touch = useTouch();
	const words = useWords();
	const cover = use(CoverTabs);
	const [sheet, lend] = useState<Dialog.Handle<unknown>>();
	const titleId = useId();
	useEffect(() => {
		if (!cover) return;
		cover(true);
		return () => cover(false);
	}, [cover]);
	const fit = touch ? "body" : "bar";
	const backAct =
		back === undefined ? null : (
			<IconButton
				icon={backGlyph(touch)}
				fit={fit}
				label={words.back}
				onAct={() => navigate(back)}
			/>
		);
	const acts = (actions ?? []).map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const details = sheet ? <Details sheet={sheet} fit={fit} /> : null;
	const overflow = more?.length ? (
		<Menu label={words.more} items={more} />
	) : null;
	const heading = (
		<h1 id={titleId} className={cn(text({ role: "title" }), TITLE)}>
			{title}
		</h1>
	);
	// The head is one tree on both densities, so crossing the density line
	// keeps its acts, their focus and an open sheet's trigger. Only the
	// title's place and the spacer differ, each a slot that holds `null` where
	// it does not draw, so the acts after it never shift.
	const head = (
		<header className={cn(touch && PAGE_HEAD, HEAD)}>
			<div className={cn(touch ? PAGE_TOP_BAR : PAGE_STRIP, ROW)}>
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
			<PageTitle value={titleId}>
				<HeadingContext value={2}>
					<div className={SCREEN}>
						{head}
						<div className={cn(PAGE_BODY, BODY)}>{children}</div>
					</div>
				</HeadingContext>
			</PageTitle>
		</LendAct>
	);
}
