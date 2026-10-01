import type {
	ChipMark,
	IconName,
	Part,
	StatusMark,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GLYPHS, Glyph } from "../../lib/glyph";
import { MenuCircle, type MenuItems } from "../../lib/more";
import { navigate } from "../../lib/navigate";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { useWords } from "../../lib/words";
import { Avatar } from "../avatar";
import { Chip } from "../chip";
import { Status } from "../status";

export type RowLeading =
	| { icon: IconName }
	| { status: StatusState }
	| { avatar: { name: string; src?: string } };
export type RowTrailing =
	| { age: string }
	| { count: number }
	| { value: string };

export interface ListRowProps extends Closed {
	leading?: RowLeading;
	title: Part;
	meta?: readonly Part[] | readonly (readonly Part[])[];
	trailing?: RowTrailing;
	status?: StatusMark;
	chip?: ChipMark;
	more?: MenuItems;
	href?: string;
	onOpen?: () => void;
}

function metaLines(
	meta: readonly Part[] | readonly (readonly Part[])[] | undefined,
): readonly (readonly Part[])[] {
	if (!meta || meta.length === 0) return [];
	return Array.isArray(meta[0])
		? (meta as readonly (readonly Part[])[])
		: [meta as readonly Part[]];
}

// A row of a list or a group: no chevron, no divider; `href` draws nothing.
// `more` is the row's acts under a more circle at its end, its only act.
export function ListRow({
	leading,
	title,
	meta,
	trailing,
	status,
	chip,
	more,
	href,
	onOpen,
}: ListRowProps) {
	const words = useWords();
	const open = href !== undefined ? () => navigate(href) : onOpen;
	return (
		<Pressable
			accessibilityRole={open ? "button" : undefined}
			disabled={!open}
			onPress={open}
			className={cn(
				row({ state: "rest" }),
				"flex-row items-center",
				open && "active:bg-wash-press",
			)}
		>
			{leading ? <Leading leading={leading} /> : null}
			<View className="min-w-0 flex-1 gap-pair">
				<RNText
					numberOfLines={2}
					className={cn(text({ role: "body" }), textStrong({ role: "body" }))}
				>
					{partText(title)}
				</RNText>
				{metaLines(meta).map((line) => (
					<RNText
						key={joinParts(line, META_CUT)}
						numberOfLines={1}
						className={text({ role: "meta" })}
					>
						{joinParts(line, META_CUT)}
					</RNText>
				))}
			</View>
			{status ? <Status state={status.state} label={status.label} /> : null}
			{chip ? <Chip family={chip.family} label={chip.label} /> : null}
			{trailing ? <Trailing trailing={trailing} /> : null}
			{more ? (
				<MenuCircle label={words.more} title={partText(title)} items={more} />
			) : null}
		</Pressable>
	);
}

function Leading({ leading }: { leading: RowLeading }) {
	if ("status" in leading) return <Status state={leading.status} label="" />;
	if ("avatar" in leading) return <Avatar {...leading.avatar} />;
	return <LeadingIcon name={leading.icon} />;
}

function LeadingIcon({ name }: { name: IconName }) {
	return <Glyph icon={GLYPHS[name]} tone="ink-meta" />;
}

function Trailing({ trailing }: { trailing: RowTrailing }) {
	const value =
		"age" in trailing
			? trailing.age
			: "count" in trailing
				? String(trailing.count)
				: trailing.value;
	return <RNText className={text({ role: "meta" })}>{value}</RNText>;
}
