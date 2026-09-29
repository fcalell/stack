import { CODE, text } from "@fcalell/ui-core/variants";
import * as Clipboard from "expo-clipboard";
import { Check, ChevronDown, Copy } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text as RNText, ScrollView, View } from "react-native";
import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { LoadingRows } from "../../lib/loading";
import { useWords } from "../../lib/words";

export interface CodeProps extends Closed {
	text: string;
	title?: string;
	tail?: number;
	copy?: boolean;
	loading?: boolean;
}

const COPIED_MS = 2000;

// Mono, scrolls sideways, never wraps. `title` heads the block with what the
// text is (a file's name, the tool it goes into); `tail` shows the last
// lines until a tap unfolds the rest; `copy` draws the copy act, in the
// title's row when there is one, else under the text.
export function Code({ text: source, title, tail, copy, loading }: CodeProps) {
	const words = useWords();
	const [unfolded, setUnfolded] = useState(false);
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), COPIED_MS);
		return () => clearTimeout(timer);
	}, [copied]);
	if (loading) return <LoadingRows />;
	const lines = source.split("\n");
	const folded = tail !== undefined && !unfolded && lines.length > tail;
	const shown = folded ? lines.slice(lines.length - tail) : lines;
	const copyAct = copy ? (
		<View className="flex-row items-center justify-end gap-row">
			{copied ? (
				<RNText className={text({ role: "meta" })}>{words.copied}</RNText>
			) : null}
			<Circle
				icon={copied ? Check : Copy}
				label={copied ? words.copied : words.copy}
				onAct={() => {
					Clipboard.setStringAsync(source).then(() => setCopied(true));
				}}
			/>
		</View>
	) : null;
	return (
		<View className={cn(CODE, "gap-row")}>
			{title ? (
				<View className="flex-row items-center gap-row">
					<RNText
						numberOfLines={1}
						className={cn(text({ role: "meta" }), "flex-1")}
					>
						{title}
					</RNText>
					{copyAct}
				</View>
			) : null}
			{folded ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={words.more}
					onPress={() => setUnfolded(true)}
					className="min-h-11 flex-row items-center gap-pair"
				>
					<Glyph icon={ChevronDown} tone="ink-meta" size={16} />
					<RNText className={text({ role: "meta" })}>
						{lines.length - tail}
					</RNText>
				</Pressable>
			) : null}
			<ScrollView horizontal showsHorizontalScrollIndicator={false}>
				<RNText className={text({ role: "mono" })}>{shown.join("\n")}</RNText>
			</ScrollView>
			{title ? null : copyAct}
		</View>
	);
}
