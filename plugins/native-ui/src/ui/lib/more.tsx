import type { MenuItem } from "@fcalell/ui-core/descriptors";
import {
	HAIRLINE,
	type IconButtonFit,
	row,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Icon } from "../components/icon";
import { IconButton } from "../components/icon-button";
import { Sheet } from "../components/sheet";
import { cn } from "./cn";
import { Ink } from "./ink";

export type MenuItems = MenuItem[] | MenuItem[][];

// A flat list is one group; a list of lists is groups under separators.
export function groupsOf(items: MenuItems): MenuItem[][] {
	if (items.length === 0) return [];
	return Array.isArray(items[0])
		? (items as MenuItem[][])
		: [items as MenuItem[]];
}

// A menu on the phone: a sheet of one-line acts, each group under a
// hairline; a destructive act in `danger`, a blocked one faded with its
// reason under it. Taking an act closes the sheet first.
export function MenuSheet({
	title,
	open,
	onClose,
	items,
}: {
	title: string;
	open: boolean;
	onClose: () => void;
	items: MenuItems;
}) {
	return (
		<Sheet open={open} onClose={onClose} title={title}>
			{groupsOf(items).map((group, at) => (
				<View
					key={group.map((item) => item.label).join("\u0000")}
					className={cn(at > 0 && cn(HAIRLINE, "border-t"))}
				>
					{group.map((item) => (
						<MenuRow
							key={item.label}
							item={item}
							onAct={() => {
								onClose();
								item.onAct();
							}}
						/>
					))}
				</View>
			))}
		</Sheet>
	);
}

// A more circle, `label` read aloud, opening its acts as a sheet titled
// `title`; `fit` is its place's, as an `IconButton`'s.
export function MenuCircle({
	label,
	title,
	items,
	fit,
}: {
	label: string;
	title: string;
	items: MenuItems;
	fit?: IconButtonFit;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<IconButton
				icon="Ellipsis"
				label={label}
				fit={fit}
				onAct={() => setOpen(true)}
			/>
			<MenuSheet
				title={title}
				open={open}
				onClose={() => setOpen(false)}
				items={items}
			/>
		</>
	);
}

// One act of a menu sheet, its glyph first.
export function MenuRow({
	item,
	onAct,
}: {
	item: MenuItem;
	onAct: () => void;
}) {
	const blocked = item.blocked !== undefined;
	return (
		<Pressable
			accessibilityRole="menuitem"
			accessibilityState={{ disabled: blocked }}
			disabled={blocked}
			onPress={onAct}
			className={cn(
				row({ state: "rest" }),
				"flex-row items-center active:bg-wash-press",
			)}
		>
			{item.icon ? (
				<Ink.Provider value="ink-meta">
					<Icon name={item.icon} />
				</Ink.Provider>
			) : null}
			<View className="min-w-0 flex-1 gap-pair">
				<RNText
					numberOfLines={1}
					className={cn(
						text({ role: "body" }),
						item.destructive && "text-danger",
						blocked && "text-ink-faint",
					)}
				>
					{item.label}
				</RNText>
				{item.blocked ? (
					<RNText className={text({ role: "meta" })}>{item.blocked}</RNText>
				) : null}
			</View>
		</Pressable>
	);
}
