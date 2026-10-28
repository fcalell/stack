import { Dialog } from "@base-ui/react/dialog";
import { Menu as Control } from "@base-ui/react/menu";
import { cn } from "@fcalell/ui-core/cn";
import {
	LAYER_POPOVER,
	menu,
	menuGroup,
	menuLabel,
	OPTION_ROW,
	POPOVER,
	row,
	text,
} from "@fcalell/ui-core/variants";
import { type KeyboardEvent, type ReactNode, use, useState } from "react";
import type { MenuEntry } from "../../lib/act.ts";
import { useAct } from "../../lib/act.ts";
import { expandedTrigger, rememberOpener } from "../../lib/focus.ts";
import { useQuietGuards } from "../../lib/guards.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { IconButtonBase } from "../button/glyph.tsx";
import { Icon } from "../icon/index.tsx";
import { ActSheet } from "../sheet/act.tsx";
import { SheetBase } from "../sheet/base.tsx";

// Base UI focuses the popup itself after a pointer open; its rows carry the ring.
const POPUP = "flex flex-col outline-none";
const POSITIONER = "z-(--layer-popover)";
const GROUP = "flex flex-col";
// A row the keyboard reaches rings inset over its wash, which alone sits
// under the 3:1 a state needs; the pointer's highlight is the wash alone.
const ITEM = "flex items-center focus-visible:-outline-offset-2";
const PRESS = "active:bg-wash-press";
// A touch row is a button: the start of its line, and its focus the
// keyboard's highlight.
const BUTTON = "text-start focus-visible:bg-wash-hover";
const GLYPH = "flex shrink-0";
const GLYPH_INK = {
	act: "text-ink-meta",
	destructive: "text-danger",
	blocked: "text-ink-disabled",
} as const;
const LABEL = "min-w-0 grow truncate";
const LABEL_BLOCKED = "truncate text-ink-disabled";
const TEXT = "flex flex-col min-w-0 grow";

// A link entry goes to a route: it is never blocked and removes nothing.
const blockedOf = (item: MenuEntry) =>
	"blocked" in item ? item.blocked : undefined;
const destructiveOf = (item: MenuEntry) =>
	"destructive" in item && item.destructive === true;

function groupsOf(items: readonly MenuEntry[]) {
	return [
		{
			kind: "acts" as const,
			items: items.filter((item) => !destructiveOf(item)),
		},
		{
			kind: "destructive" as const,
			items: items.filter((item) => destructiveOf(item)),
		},
	].filter((group) => group.items.length > 0);
}

// An item's glyph, its label and, blocked, its reason under the label.
function ItemLine(props: { item: MenuEntry }) {
	const { item } = props;
	const blocked = blockedOf(item) !== undefined;
	const kind = destructiveOf(item) ? "destructive" : "act";
	return (
		<>
			{item.icon ? (
				<span className={cn(GLYPH, GLYPH_INK[blocked ? "blocked" : kind])}>
					<Icon name={item.icon} />
				</span>
			) : null}
			{blocked ? (
				<span className={TEXT}>
					<span
						className={cn(
							text({ role: "body" }),
							menuLabel({ kind }),
							LABEL_BLOCKED,
						)}
					>
						{item.label}
					</span>
					<span className={text({ role: "meta" })}>{blockedOf(item)}</span>
				</span>
			) : (
				<span
					className={cn(text({ role: "body" }), menuLabel({ kind }), LABEL)}
				>
					{item.label}
				</span>
			)}
		</>
	);
}

function rowOf(item: MenuEntry, highlighted: boolean): string {
	const blocked = blockedOf(item) !== undefined;
	return cn(
		row({ state: highlighted && !blocked ? "highlighted" : "rest" }),
		OPTION_ROW,
		ITEM,
		!blocked && PRESS,
	);
}

// The touch sheet's rows are buttons the arrow keys, Home and End move
// through, the way a popover's rows move under Base UI.
function moveFocus(event: KeyboardEvent<HTMLElement>): void {
	const rows = [
		...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
	];
	const at = rows.indexOf(document.activeElement as HTMLElement);
	const next =
		event.key === "ArrowDown"
			? (at + 1) % rows.length
			: event.key === "ArrowUp"
				? (at - 1 + rows.length) % rows.length
				: event.key === "Home"
					? 0
					: event.key === "End"
						? rows.length - 1
						: undefined;
	if (next === undefined) return;
	event.preventDefault();
	rows[next]?.focus();
}

function Groups(props: {
	items: readonly MenuEntry[];
	item: (item: MenuEntry) => ReactNode;
}) {
	return groupsOf(props.items).map((group, index) => (
		<div
			key={group.kind}
			className={cn(
				menuGroup({ place: index === 0 ? "first" : "after" }),
				GROUP,
			)}
		>
			{group.items.map(props.item)}
		</div>
	));
}

// The more act named `label` and its acts, the touch sheet titled `title`:
// a row's menu is titled with the row's name. It holds its items' run, the
// trigger drawn pending while one runs. `painted` is the trigger while
// its data is not here: its box filled, inert, so nothing opens. Outside the
// package's exports.
export function MenuBase({
	label,
	title,
	items,
	painted,
	tabIndex,
}: {
	label: string;
	title: string;
	items: readonly MenuEntry[];
	painted?: boolean;
	/** `-1` where the trigger's host holds the tab stop (a tree's row); absent, the trigger keeps its own. */
	tabIndex?: -1;
}) {
	const touch = useTouch();
	const container = use(PortalContainer);
	useQuietGuards();
	// Each item runs under its label, so the sheet that opens is its item's.
	const acting = useAct<string>("toast");
	const pending = acting.pending !== undefined;
	const sheetOf = (label: string) => {
		const item = items.find((one) => one.label === label);
		return item && "sheet" in item ? item.sheet : undefined;
	};
	const [open, setOpen] = useState(false);
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	if (touch) {
		return (
			<>
				<Dialog.Trigger
					handle={sheet}
					render={
						<IconButtonBase
							icon="Ellipsis"
							label={label}
							painted={painted}
							pending={pending}
							tabIndex={tabIndex}
						/>
					}
				/>
				<SheetBase
					form="menu"
					handle={sheet}
					open={open}
					onOpen={() => setOpen(true)}
					onClose={() => setOpen(false)}
					title={title}
				>
					<div
						role="menu"
						aria-label={label}
						onKeyDown={moveFocus}
						className={cn(menu({ form: "sheet" }), POPUP)}
					>
						<Groups
							items={items}
							item={(item) =>
								"href" in item ? (
									<a
										key={item.label}
										href={item.href}
										role="menuitem"
										onClick={(event) => {
											rememberOpener(expandedTrigger(document));
											setOpen(false);
											follow(event);
										}}
										className={cn(rowOf(item, false), BUTTON)}
									>
										<ItemLine item={item} />
									</a>
								) : (
									<button
										key={item.label}
										type="button"
										role="menuitem"
										aria-disabled={item.blocked !== undefined || undefined}
										onClick={() => {
											if (item.blocked !== undefined) return;
											rememberOpener(expandedTrigger(document));
											setOpen(false);
											acting.run(item.label, item);
										}}
										className={cn(rowOf(item, false), BUTTON)}
									>
										<ItemLine item={item} />
									</button>
								)
							}
						/>
					</div>
				</SheetBase>
				<ActSheet acting={acting} of={sheetOf} />
			</>
		);
	}
	return (
		<Control.Root modal={false}>
			<Control.Trigger
				render={
					<IconButtonBase
						icon="Ellipsis"
						label={label}
						painted={painted}
						pending={pending}
						tabIndex={tabIndex}
					/>
				}
			/>
			<Control.Portal container={container}>
				<Control.Positioner
					className={POSITIONER}
					align="end"
					sideOffset={() => spacing("gap")}
				>
					<Control.Popup
						className={cn(
							POPOVER,
							menu({ form: "popover" }),
							POPUP,
							LAYER_POPOVER,
						)}
					>
						<Groups
							items={items}
							item={(item) =>
								"href" in item ? (
									<Control.LinkItem
										key={item.label}
										label={item.label}
										href={item.href}
										// A link entry closes its menu as the touch sheet's does: the
										// route it opens may keep the menu's Pane mounted.
										closeOnClick
										onClick={(event) => {
											rememberOpener(expandedTrigger(document));
											follow(event);
										}}
										className={(state) => rowOf(item, state.highlighted)}
									>
										<ItemLine item={item} />
									</Control.LinkItem>
								) : (
									<Control.Item
										key={item.label}
										label={item.label}
										onClick={() => {
											rememberOpener(expandedTrigger(document));
											acting.run(item.label, item);
										}}
										disabled={item.blocked !== undefined}
										className={(state) => rowOf(item, state.highlighted)}
									>
										<ItemLine item={item} />
									</Control.Item>
								)
							}
						/>
					</Control.Popup>
				</Control.Positioner>
			</Control.Portal>
			<ActSheet acting={acting} of={sheetOf} />
		</Control.Root>
	);
}
