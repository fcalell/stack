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
import { More } from "../place/index.tsx";

const SCREEN = "flex flex-col grow min-h-0";
const STRIP = "flex items-center";
const HEAD = "flex flex-col";
const TOP_BAR = "relative flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow";
// The body scrolls under the fixed head.
const BODY = "flex flex-col overflow-y-auto";

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

/** A page pushed over a place: the back act first and no filled act. On the desktop it stands in the shell's column under one strip; on touch the top bar (back, actions, more) stands over the title and the screen covers the tab bar. A Split inside lends it its Details act. */
export function Screen({ title, back, actions, more, children }: ScreenProps) {
	const touch = useTouch();
	const words = useWords();
	const cover = use(CoverTabs);
	const [lent, lend] = useState<IconAct>();
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
				icon={touch ? "ChevronLeft" : "ArrowLeft"}
				fit={fit}
				label={words.back}
				onAct={() => navigate(back)}
			/>
		);
	const acts = [...(actions ?? []), ...(lent ? [lent] : [])].map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const overflow = more?.length ? <More items={more} fit={fit} /> : null;
	const heading = (
		<h1 id={titleId} className={cn(text({ role: "title" }), TITLE)}>
			{title}
		</h1>
	);
	return (
		<LendAct value={lend}>
			<PageTitle value={titleId}>
				<HeadingContext value={2}>
					<div className={SCREEN}>
						{touch ? (
							<header className={cn(PAGE_HEAD, HEAD)}>
								<div className={cn(PAGE_TOP_BAR, TOP_BAR)}>
									{backAct}
									<span className={SPACER} />
									{acts}
									{overflow}
								</div>
								{heading}
							</header>
						) : (
							<header className={cn(PAGE_STRIP, STRIP)}>
								{backAct}
								{heading}
								{acts}
								{overflow}
							</header>
						)}
						<div className={cn(PAGE_BODY, BODY)}>{children}</div>
					</div>
				</HeadingContext>
			</PageTitle>
		</LendAct>
	);
}
