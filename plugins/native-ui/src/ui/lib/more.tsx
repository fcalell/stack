import type {
	Act,
	IconAct,
	IconName,
	MenuItem,
} from "@fcalell/ui-core/descriptors";
import { HAIRLINE, row, text } from "@fcalell/ui-core/variants";
import { Ellipsis } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Sheet } from "../components/sheet";
import { Circle } from "./circle";
import { cn } from "./cn";
import { GLYPHS, Glyph } from "./glyph";

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
// `title`.
export function MenuCircle({
	label,
	title,
	items,
}: {
	label: string;
	title: string;
	items: MenuItems;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Circle icon={Ellipsis} label={label} onAct={() => setOpen(true)} />
			<MenuSheet
				title={title}
				open={open}
				onClose={() => setOpen(false)}
				items={items}
			/>
		</>
	);
}

// What a top bar's more circle opens: the actions past the bar's circles,
// each with its glyph, then the labelled `more` acts under a separator.
export function MoreSheet({
	title,
	open,
	onClose,
	actions,
	more,
}: {
	title: string;
	open: boolean;
	onClose: () => void;
	actions: IconAct[];
	more: Act[];
}) {
	const items = [
		actions.map((action) => ({
			label: action.label,
			icon: action.icon,
			onAct: action.onAct,
		})),
		more.map((act) => ({
			label: act.label,
			onAct: act.onAct,
			blocked: act.blocked,
		})),
	].filter((group) => group.length > 0);
	return (
		<MenuSheet title={title} open={open} onClose={onClose} items={items} />
	);
}

function MenuRow({ item, onAct }: { item: MenuItem; onAct: () => void }) {
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
			{item.icon ? <ItemGlyph name={item.icon} /> : null}
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

function ItemGlyph({ name }: { name: IconName }) {
	return <Glyph icon={GLYPHS[name]} tone="ink-meta" />;
}
