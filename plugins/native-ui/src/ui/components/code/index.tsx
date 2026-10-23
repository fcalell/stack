import {
	type Datum,
	type Drawn,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { counted, named } from "@fcalell/ui-core/tokens";
import {
	CARD,
	CODE_ACT,
	CODE_FOLD,
	CODE_HEAD,
	CODE_UNDER_HEAD,
	codeText,
	text,
} from "@fcalell/ui-core/variants";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Fragment, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useCopy } from "../../lib/copy";
import { Ink } from "../../lib/ink";
import { inertProps, Painted, PaintText } from "../../lib/paint";
import { toast } from "../../lib/toast";
import { useWords } from "../../lib/words";
import { IconButtonBase } from "../button/glyph";
import { Icon } from "../icon";

const FRAME = "min-w-0 overflow-hidden";
const HEAD = "flex-row items-center";
const TITLE = "grow shrink min-w-0";
const BODY = "flex-row min-w-0";
const TEXT_BESIDE = "flex-1 min-w-0";
const ACT = "shrink-0 flex-row gap-gap";
const FOLD = "flex-row items-center w-full active:bg-wash-press";

export interface CodeProps extends Closed {
	/** The text, its lines split on newlines (text; wraps). A selection paints `PAINT_ROWS` lines until its read lands. */
	text: Datum<string>;
	/** What the text is (a file's name, the tool it goes into), in a head over it; it names the acts (a short phrase; truncates). */
	title?: string;
	// Shows only the last lines, this many, behind an act that reveals the
	// earlier ones.
	tail?: number;
	// Adds the copy act, named by the title (else by the download's file, else
	// just Copy): in the head with a title, else in its own column beside the first
	// line.
	copy?: boolean;
	// Adds the download act, saving the text as a file of this name
	// (`recovery-codes.txt`), named by the title (else by the file): after the
	// copy act, in the same place.
	download?: string;
}

// The copy act: a check and the word Copied for two seconds once copied; a
// refused write raises the failed Toast.
function CopyAct(props: { name?: string; value: string; painted: boolean }) {
	const { name, value, painted } = props;
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<IconButtonBase
			painted={painted}
			icon={done ? "Check" : "Copy"}
			label={done ? words.copied : named(words.copy, name)}
			onAct={() => copy(value)}
		/>
	);
}

// The download act: the text written to the cache directory as a file of the
// given name and handed to the share sheet, from which the phone saves it to
// Files. A refused write or share raises the failed Toast.
function DownloadAct(props: {
	name: string;
	value: string;
	file: string;
	painted: boolean;
}) {
	const words = useWords();
	const save = async () => {
		const file = new File(Paths.cache, props.file);
		await file.write(props.value);
		await Sharing.shareAsync(file.uri, { mimeType: "text/plain" });
	};
	return (
		<IconButtonBase
			painted={props.painted}
			icon="Download"
			label={named(words.download, props.name)}
			onAct={() => {
				save().catch(() => toast(words.downloadFailed, { tone: "failed" }));
			}}
		/>
	);
}

// Mono at the code role in the frame Code, Diff share; a long
// line wraps, never scrolling sideways. A head names it
// (`title`) and carries the copy and download acts; without a title they
// stand side by side in a column beside the first line. `tail` folds the earlier lines behind a
// one-way act that reveals them and leaves.
export function Code({ text: datum, title, tail, copy, download }: CodeProps) {
	const [drawn] = useSelections([datum] as const) as [Drawn<string>];
	const painted = paints(drawn);
	const source = drawn.painted ? "" : drawn.value;
	const words = useWords();
	const [unfolded, setUnfolded] = useState(false);
	const acts = (
		<>
			{copy ? (
				<CopyAct name={title ?? download} value={source} painted={painted} />
			) : null}
			{download ? (
				<DownloadAct
					name={title ?? download}
					value={source}
					file={download}
					painted={painted}
				/>
			) : null}
		</>
	);
	const head = title ? (
		<View className={cn(CODE_HEAD, HEAD)}>
			<RNText numberOfLines={1} className={cn(text({ role: "meta" }), TITLE)}>
				{title}
			</RNText>
			{acts}
		</View>
	) : null;
	// Painted, the text is `PAINT_ROWS` lines of filler and never folds.
	const lines = painted ? [] : source.split("\n");
	const hidden =
		tail !== undefined && !unfolded ? Math.max(0, lines.length - tail) : 0;
	const shown = hidden > 0 ? lines.slice(hidden) : lines;
	const beside = (copy === true || download !== undefined) && !title;
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
				<RNText className={cn(text({ role: "meta" }), "shrink")}>
					{counted(words.earlierLines, hidden)}
				</RNText>
			</Pressable>
		) : null;
	const body = (
		<View
			className={cn(
				codeText({ act: beside ? "beside" : "none" }),
				title && !fold && CODE_UNDER_HEAD,
				beside && TEXT_BESIDE,
			)}
		>
			<PaintText painted={painted} className={text({ role: "code" })}>
				{painted
					? Array.from({ length: PAINT_ROWS }, (_, at) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
							<Fragment key={at}>
								{at > 0 ? "\n" : null}
								<Painted role="sentence" at={at} />
							</Fragment>
						))
					: shown.join("\n")}
			</PaintText>
		</View>
	);
	// An ended read draws no text; the frame that holds it says why.
	if (drawn.painted && !painted) return null;
	return (
		<View {...inertProps(painted)} className={cn(CARD, FRAME)}>
			{head}
			{fold}
			{beside ? (
				<View className={BODY}>
					{body}
					{/* The act stands at the column's top, not centred on the first
					line: an act taller than the line would overhang its box, and
					iOS delivers no touch outside a view's bounds. */}
					<View className={cn(CODE_ACT, ACT)}>{acts}</View>
				</View>
			) : (
				body
			)}
		</View>
	);
}
