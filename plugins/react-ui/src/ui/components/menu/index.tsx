import { Dialog } from "@base-ui/react/dialog";
import { Menu as Control } from "@base-ui/react/menu";
import { cn } from "@fcalell/ui-core/cn";
import type { MenuItem } from "@fcalell/ui-core/descriptors";
import {
	menu,
	menuGroup,
	menuLabel,
	POPOVER,
	row,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useState } from "react";
import { arrowsOver } from "../../lib/arrows.ts";
import type { Closed } from "../../lib/closed.ts";
import { spacing, useTouch } from "../../lib/media.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { Icon } from "../icon/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { SheetBase } from "../sheet/base.tsx";

const POPUP = "flex flex-col";
// The popover drops in from a float above as it fades, and fades out; on
// transform and opacity alone, the rungs zeroed under reduced motion.
const POPUP_MOTION =
	"transition-[opacity,translate] duration-base ease-out data-starting-style:-translate-y-float data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-in";
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

/** A menu of acts behind the more act. */
export interface MenuProps extends Closed {
	/** The trigger's accessible name, and the touch sheet's title. */
	label: string;
	/** The acts in order; the destructive ones stand last under a hairline. */
	items: readonly MenuItem[];
}

function groupsOf(items: readonly MenuItem[]) {
	return [
		{ kind: "acts" as const, items: items.filter((item) => !item.destructive) },
		{
			kind: "destructive" as const,
			items: items.filter((item) => item.destructive),
		},
	].filter((group) => group.items.length > 0);
}

// An item's glyph, its label and, blocked, its reason under the label.
function ItemLine(props: { item: MenuItem }) {
	const { item } = props;
	const blocked = item.blocked !== undefined;
	const kind = item.destructive ? "destructive" : "act";
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
					<span className={text({ role: "meta" })}>{item.blocked}</span>
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

function rowOf(item: MenuItem, highlighted: boolean): string {
	const blocked = item.blocked !== undefined;
	return cn(
		row({
			lines: blocked ? "two" : "one",
			state: highlighted ? "highlighted" : "rest",
		}),
		ITEM,
		!blocked && PRESS,
	);
}

// The touch sheet's rows, a menu the arrow keys move through.
const moveFocus = arrowsOver("menuitem");

function Groups(props: {
	items: readonly MenuItem[];
	item: (item: MenuItem) => ReactNode;
}) {
	return groupsOf(props.items).map((group) => (
		<div
			key={group.kind}
			className={cn(menuGroup({ kind: group.kind }), GROUP)}
		>
			{group.items.map(props.item)}
		</div>
	));
}

/** The more act and its acts: on the desktop a popover under the trigger, the keyboard's row under the hover wash; on touch a bottom sheet titled `label` with its close act, taking an act closing it first. A destructive act draws in danger ink, a blocked one inert with its reason under its label. */
export function Menu({ label, items }: MenuProps) {
	const touch = useTouch();
	const container = use(PortalContainer);
	const [open, setOpen] = useState(false);
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	if (touch) {
		return (
			<>
				<Dialog.Trigger
					handle={sheet}
					render={<IconButtonBase icon="Ellipsis" fit="body" label={label} />}
				/>
				<SheetBase
					form="menu"
					handle={sheet}
					open={open}
					onOpen={() => setOpen(true)}
					onClose={() => setOpen(false)}
					title={label}
				>
					<div
						role="menu"
						aria-label={label}
						onKeyDown={moveFocus}
						className={cn(menu({ form: "sheet" }), POPUP)}
					>
						<Groups
							items={items}
							item={(item) => (
								<button
									key={item.label}
									type="button"
									role="menuitem"
									aria-disabled={item.blocked !== undefined || undefined}
									onClick={() => {
										if (item.blocked !== undefined) return;
										setOpen(false);
										item.onAct();
									}}
									className={cn(rowOf(item, false), BUTTON)}
								>
									<ItemLine item={item} />
								</button>
							)}
						/>
					</div>
				</SheetBase>
			</>
		);
	}
	return (
		<Control.Root modal={false}>
			<Control.Trigger
				render={<IconButtonBase icon="Ellipsis" fit="bar" label={label} />}
			/>
			<Control.Portal container={container}>
				<Control.Positioner align="end" sideOffset={() => spacing("pair")}>
					<Control.Popup
						className={cn(
							POPOVER,
							menu({ form: "popover" }),
							POPUP,
							POPUP_MOTION,
						)}
					>
						<Groups
							items={items}
							item={(item) => (
								<Control.Item
									key={item.label}
									label={item.label}
									onClick={item.onAct}
									disabled={item.blocked !== undefined}
									className={(state) => rowOf(item, state.highlighted)}
								>
									<ItemLine item={item} />
								</Control.Item>
							)}
						/>
					</Control.Popup>
				</Control.Positioner>
			</Control.Portal>
		</Control.Root>
	);
}
