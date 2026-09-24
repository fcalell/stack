import type {
	Act,
	Mark,
	Part,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { useIcon } from "../../lib/icons";
import { navigate } from "../../lib/navigate";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { Status } from "../status";

export type RowLeading = { icon: string } | { status: StatusState };
export type RowTrailing =
	| { age: string }
	| { count: number }
	| { value: string };

export interface ListRowProps extends Closed {
	leading?: RowLeading;
	title: Part;
	meta?: readonly Part[] | readonly (readonly Part[])[];
	trailing?: RowTrailing;
	marks?: Mark<string>[];
	act?: Act;
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
export function ListRow({
	leading,
	title,
	meta,
	trailing,
	marks,
	act,
	href,
	onOpen,
}: ListRowProps) {
	const open = href !== undefined ? () => navigate(href) : onOpen;
	return (
		<Pressable
			accessibilityRole={open ? "button" : undefined}
			disabled={!open}
			onPress={open}
			className={cn(
				row({ state: "rest" }),
				"flex-row items-center",
				open && "active:bg-edge",
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
			{marks?.map((mark) => (
				<MarkGlyph key={mark.label} mark={mark} />
			))}
			{trailing ? <Trailing trailing={trailing} /> : null}
			{act ? <RowAct act={act} /> : null}
		</Pressable>
	);
}

function Leading({ leading }: { leading: RowLeading }) {
	if ("status" in leading) return <Status state={leading.status} label="" />;
	return <LeadingIcon name={leading.icon} />;
}

function LeadingIcon({ name }: { name: string }) {
	return <Glyph icon={useIcon(name)} tone="ink-meta" />;
}

function MarkGlyph({ mark }: { mark: Mark<string> }) {
	return (
		<View accessibilityLabel={mark.label}>
			<Glyph icon={useIcon(mark.icon)} tone="ink-meta" size={16} />
		</View>
	);
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

// A row's act: a text act in tint, 44 px tall.
export function RowAct({ act }: { act: Act }) {
	const muted = act.blocked !== undefined || act.loading;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: muted }}
			disabled={muted}
			onPress={act.onAct}
			className="min-h-11 justify-center"
		>
			<RNText
				className={cn(
					text({ role: "body" }),
					"font-medium text-tint",
					muted && "text-ink-faint",
				)}
			>
				{act.label}
			</RNText>
		</Pressable>
	);
}
