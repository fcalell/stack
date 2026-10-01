import { Menu } from "@base-ui/react/menu";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, IconAct, MenuItem } from "@fcalell/ui-core/descriptors";
import {
	FLOATING_ACT,
	FLOATING_ACT_ROOM,
	type IconButtonFit,
	iconButton,
	PAGE_BLEED,
	PAGE_BODY,
	PAGE_HEAD,
	PAGE_STRIP,
	PAGE_TOP_BAR,
	POPOVER,
	row,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { LendAct, PageTitle, ShellSwitcher } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";

const PLACE = "flex flex-col grow min-h-0";
const STRIP = "flex items-center";
const HEAD = "flex flex-col";
const TOP_BAR = "flex items-center";
const SPACER = "grow";
const TITLE = "min-w-0 grow";
// The body scrolls under the fixed head; a bleeding body leaves scrolling
// to its child.
const BODY = "flex flex-col overflow-y-auto";
const BLEED = "flex flex-col";
const BODY_WRAP = "relative flex flex-col grow min-h-0";
const ACT_ROOM = "shrink-0";
const ACT_LAYER =
	"absolute inset-0 flex flex-col items-center justify-end pointer-events-none";
const ACT_HIT = "flex pointer-events-auto";

// The more act is an IconButton's box that stays pressed while its menu is open.
const MORE_BOX = "relative inline-flex items-center justify-center shrink-0";
const MORE_PRESS =
	"hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
const MORE_OPEN = "data-popup-open:bg-wash-press data-popup-open:text-ink-body";
const MENU = "flex flex-col w-popover";
const MENU_ROWS = "flex flex-col gap-rows";
// The highlight wash marks the keyboard's row, so a row draws no ring.
const MENU_ROW = "flex items-center outline-none";
const MENU_GLYPH = "flex shrink-0 text-ink-meta";
const MENU_LINE = "flex flex-col min-w-0 grow";
const MENU_LABEL = "truncate";
const MENU_DANGER = "text-danger";

/** The overflow of a page's acts: an icon act that opens a menu of `MenuItem`s, a destructive one in danger ink, a blocked one inert with its reason under its label. */
export function More(props: {
	items: readonly MenuItem[];
	fit: IconButtonFit;
}) {
	const words = useWords();
	const container = use(PortalContainer);
	return (
		<Menu.Root modal={false}>
			<Menu.Trigger
				render={(trigger) => (
					<button
						{...trigger}
						aria-label={words.more}
						className={cn(
							iconButton({ fit: props.fit }),
							MORE_BOX,
							MORE_PRESS,
							MORE_OPEN,
						)}
					>
						<Icon name="Ellipsis" fit="control" />
					</button>
				)}
			/>
			<Menu.Portal container={container}>
				<Menu.Positioner align="end" sideOffset={() => spacing("pair")}>
					<Menu.Popup className={cn(POPOVER, MENU)}>
						<div className={MENU_ROWS}>
							{props.items.map((item) => (
								<Menu.Item
									key={item.label}
									label={item.label}
									onClick={item.onAct}
									disabled={item.blocked !== undefined}
									className={(state) =>
										cn(
											row({
												state: state.highlighted ? "highlighted" : "rest",
											}),
											MENU_ROW,
										)
									}
								>
									{item.icon ? (
										<span className={MENU_GLYPH}>
											<Icon name={item.icon} />
										</span>
									) : null}
									<span className={MENU_LINE}>
										<span
											className={cn(
												text({ role: "body" }),
												MENU_LABEL,
												item.destructive && MENU_DANGER,
											)}
										>
											{item.label}
										</span>
										{item.blocked ? (
											<span className={text({ role: "meta" })}>
												{item.blocked}
											</span>
										) : null}
									</span>
								</Menu.Item>
							))}
						</div>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

/** A page in the shell. */
export interface PlaceProps extends Closed {
	/** The page's title, its one `h1`. */
	title: string;
	/** Icon acts beside the title, in order. */
	actions?: IconAct[];
	/** The page's one filled act: rightmost in the desktop strip, floating over the body's end on touch. */
	act?: Act;
	/** The acts past the actions, in a menu under the more act. */
	more?: MenuItem[];
	/** The body runs edge to edge with no inset, and its child scrolls itself. */
	bleed?: boolean;
	/** The page's sections. */
	children?: ReactNode;
}

/** A page: on the desktop the title and its acts share one strip under a hairline; on touch the top bar (the shell's switcher, the actions, more) stands over the title and the act floats over the body's end. A Split inside lends it its Details act. */
export function Place({
	title,
	actions,
	act,
	more,
	bleed,
	children,
}: PlaceProps) {
	const touch = useTouch();
	const switcher = use(ShellSwitcher);
	const titleId = useId();
	const [lent, lend] = useState<IconAct>();
	const fit = touch ? "body" : "bar";
	const acts = [...(actions ?? []), ...(lent ? [lent] : [])].map((action) => (
		<IconButton key={action.label} {...action} fit={fit} />
	));
	const overflow = more?.length ? <More items={more} fit={fit} /> : null;
	const heading = (
		<h1 id={titleId} className={cn(text({ role: "title" }), TITLE)}>
			{title}
		</h1>
	);
	// The page's act is its create act by rule, so it carries the plus.
	const button = act ? (
		<Button
			fit={fit}
			icon="Plus"
			label={act.label}
			onAct={act.onAct}
			loading={act.loading}
			blocked={act.blocked}
		/>
	) : null;
	const body = (
		<div
			className={bleed ? cn(touch && PAGE_BLEED, BLEED) : cn(PAGE_BODY, BODY)}
		>
			{children}
			{touch && act ? (
				<div aria-hidden className={cn(FLOATING_ACT_ROOM, ACT_ROOM)} />
			) : null}
		</div>
	);
	return (
		<LendAct value={lend}>
			<PageTitle value={titleId}>
				<HeadingContext value={2}>
					<div className={PLACE}>
						{touch ? (
							<>
								<header className={cn(PAGE_HEAD, HEAD)}>
									<div className={cn(PAGE_TOP_BAR, TOP_BAR)}>
										{switcher}
										<span className={SPACER} />
										{acts}
										{overflow}
									</div>
									{heading}
								</header>
								<div className={BODY_WRAP}>
									{body}
									{button ? (
										<div className={cn(FLOATING_ACT, ACT_LAYER)}>
											<span className={ACT_HIT}>{button}</span>
										</div>
									) : null}
								</div>
							</>
						) : (
							<>
								<header className={cn(PAGE_STRIP, STRIP)}>
									{heading}
									{acts}
									{overflow}
									{button}
								</header>
								{body}
							</>
						)}
					</div>
				</HeadingContext>
			</PageTitle>
		</LendAct>
	);
}
