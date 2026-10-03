import { counted } from "@fcalell/ui-core/tokens";
import {
	CODE_ACT,
	CODE_FOLD,
	CODE_HEAD,
	CODE_UNDER_HEAD,
	CONTENT_FRAME,
	codeText,
	lineBox,
	skeleton,
	text,
} from "@fcalell/ui-core/variants";
import { useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	Pressable,
	Text as RNText,
	ScrollView,
	View,
} from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useCopy } from "../../lib/copy";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";

const FRAME = "min-w-0 overflow-hidden";
const HEAD = "flex-row items-center";
const TITLE = "grow shrink min-w-0";
const BODY = "flex-row min-w-0";
const TEXT_BESIDE = "flex-1 min-w-0";
const ACT = "shrink-0";
// A line of the code role: a zero-width strut sets its height, the act or
// the bar centred on it.
const LINE = "flex-row items-center";
const FOLD = "flex-row items-center w-full active:bg-wash-press";
const STRUT = "​";
// The loading lines, each at the length of the line it stands in for, in
// turn; the fold's word at a third.
const BARS = ["w-2/3", "w-1/2", "w-3/4"] as const;
const FOLD_WAIT = "flex-row items-center w-full";
const FOLD_BAR = "w-1/3";
const BAR = "w-full";

export interface CodeProps extends Closed {
	// The text, its lines split on newlines.
	text: string;
	// What the text is (a file's name, the tool it goes into), in a head over
	// it; it names the copy act.
	title?: string;
	// Shows only the last lines, this many, behind an act that reveals the
	// earlier ones.
	tail?: number;
	// Adds the copy act: in the head with a title, else in its own column
	// beside the first line.
	copy?: boolean;
	// The text waits: line boxes stand in for it under the head, `tail` of
	// them under the fold's when it folds.
	loading?: boolean;
}

// The copy act: a check and the word Copied for two seconds once copied; a
// refused write raises the failed Toast.
function CopyAct({ name, value }: { name: string; value: string }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<IconButton
			icon={done ? "Check" : "Copy"}
			label={done ? words.copied : `${words.copy} ${name}`}
			onAct={() => copy(value)}
		/>
	);
}

// Mono at the code role in the frame Code, Diff and ProseDiff share; never
// wraps, the text scrolling sideways inside the frame. A head names it
// (`title`) and carries the copy act; without a title the act stands in its
// own column beside the first line. `tail` folds the earlier lines behind a
// one-way act that reveals them and leaves, the screen reader's focus
// landing on the text.
export function Code({ text: source, title, tail, copy, loading }: CodeProps) {
	const words = useWords();
	const textRef = useRef<RNText>(null);
	const [unfolded, setUnfolded] = useState(false);
	// The fold leaves with the lines it folded; the focus lands on them once
	// they are drawn.
	useEffect(() => {
		if (unfolded && textRef.current)
			AccessibilityInfo.sendAccessibilityEvent(textRef.current, "focus");
	}, [unfolded]);
	const name = title ?? words.code;
	const head = title ? (
		<View className={cn(CODE_HEAD, HEAD)}>
			<RNText numberOfLines={1} className={cn(text({ role: "meta" }), TITLE)}>
				{title}
			</RNText>
			{copy && !loading ? <CopyAct name={name} value={source} /> : null}
		</View>
	) : null;
	// A folding text waits as it lands: the fold's row over `tail` lines.
	const waiting =
		tail === undefined
			? BARS
			: Array.from({ length: tail }, (_, at) => BARS[at % BARS.length]);
	if (loading)
		return (
			<View
				accessibilityState={{ busy: true }}
				className={cn(CONTENT_FRAME, FRAME)}
			>
				{head}
				{tail === undefined ? null : (
					<View className={cn(CODE_FOLD, title && CODE_UNDER_HEAD, FOLD_WAIT)}>
						<View className={cn(LINE, FOLD_BAR)}>
							<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
							<View className={cn(skeleton({ kind: "line" }), BAR)} />
						</View>
					</View>
				)}
				<View
					className={cn(
						codeText({ act: "none" }),
						title && tail === undefined && CODE_UNDER_HEAD,
					)}
				>
					{waiting.map((width, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
						<View key={index} className={LINE}>
							<RNText className={lineBox({ role: "code" })}>{STRUT}</RNText>
							<View className={cn(skeleton({ kind: "line" }), width)} />
						</View>
					))}
				</View>
			</View>
		);
	const lines = source.split("\n");
	const hidden =
		tail !== undefined && !unfolded ? Math.max(0, lines.length - tail) : 0;
	const shown = hidden > 0 ? lines.slice(hidden) : lines;
	const beside = copy === true && !title;
	const fold =
		hidden > 0 ? (
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded: false }}
				onPress={() => setUnfolded(true)}
				className={cn(CODE_FOLD, title && CODE_UNDER_HEAD, FOLD)}
			>
				<Ink.Provider value="ink-meta">
					<Icon name="ChevronUp" fit="meta" />
				</Ink.Provider>
				<RNText className={text({ role: "meta" })}>
					{counted(words.earlierLines, hidden)}
				</RNText>
			</Pressable>
		) : null;
	// The padding rides the content, so it scrolls with the text as the web's
	// does inside its scrolling box.
	const body = (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className={cn(title && !fold && CODE_UNDER_HEAD, beside && TEXT_BESIDE)}
			contentContainerClassName={codeText({ act: beside ? "beside" : "none" })}
		>
			<RNText ref={textRef} className={text({ role: "code" })}>
				{shown.join("\n")}
			</RNText>
		</ScrollView>
	);
	return (
		<View className={cn(CONTENT_FRAME, FRAME)}>
			{head}
			{fold}
			{beside ? (
				<View className={BODY}>
					{body}
					{/* The act stands at the column's top, not centred on the first
					line: an act taller than the line would overhang its box, and
					iOS delivers no touch outside a view's bounds. */}
					<View className={cn(CODE_ACT, ACT)}>
						<CopyAct name={name} value={source} />
					</View>
				</View>
			) : (
				body
			)}
		</View>
	);
}
