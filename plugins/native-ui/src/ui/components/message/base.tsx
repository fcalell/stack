import type { Message, MessageDetail } from "@fcalell/ui-core/descriptors";
import { closeOpenRuns } from "@fcalell/ui-core/streaming";
import {
	CARD,
	FIGURES,
	MESSAGE_BUBBLE,
	MESSAGE_CODE,
	MESSAGE_ENTRY,
	MESSAGE_FOLD,
	MESSAGE_HEAD,
	MESSAGE_LINE,
	MESSAGE_OPEN,
	message,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { memo, type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import { Ink } from "../../lib/ink";
import { moment } from "../../lib/moment";
import { inertProps, Painted, PaintText } from "../../lib/paint";
import {
	filled,
	flowRuns,
	META_CUT,
	META_TAIL,
	metaParts,
} from "../../lib/parts";
import { Turn } from "../../lib/turn";
import { Icon } from "../icon";
import { Prose } from "../prose";
import { PaintedProse } from "../prose/painted";
import { RowBase } from "../row";
import { Attachments } from "./attachments";

const YOURS = "items-end";
// The line centred; a free act's code or an open fold's lines under it
// start-aligned across the column.
const SYSTEM = "items-center justify-center";
const FRAMED = "overflow-hidden";
const DETAIL_TEXT = "self-stretch text-left";
const LINE_TEXT = "flex-row flex-wrap justify-center min-w-0";
// A React Native text never shrinks in a row unless told, so a long line
// wraps inside the row instead of running past it.
const WORDS = "shrink min-w-0 text-center";
const TRAIL = "shrink min-w-0";
const TRAIL_END = "max-w-4/5 text-right";
const OPEN = "flex-row items-center min-w-0 active:bg-wash-press";
const HEAD = "flex-row items-baseline";
const BUBBLE = "max-w-4/5";
// A time reads as one unit: it never shrinks or breaks beside a long line.
const TIME = "shrink-0";

// A system line and its detail: the fold's toggle over its lines, or the line
// (an act with `onOpen`) over the code, the line centred and the detail
// start-aligned across the column; a row's hairline card stands under them.
function SystemMessage(props: {
	body: string;
	time: ReactNode;
	onOpen?: () => void;
	detail?: MessageDetail;
}) {
	const { body, time, onOpen, detail } = props;
	const [open, setOpen] = useState(false);
	const words = (
		<RNText className={cn(text({ role: "meta" }), WORDS)}>{body}</RNText>
	);
	let line = (
		<View className={cn(MESSAGE_LINE, LINE_TEXT)}>
			{words}
			{time}
		</View>
	);
	if (detail?.fold !== undefined)
		line = (
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(!open)}
				className={cn(MESSAGE_OPEN, OPEN)}
			>
				{words}
				{time}
				<Ink.Provider value="ink-meta">
					<Turn name="ChevronDown" fit="meta" turned={!open} by="quarter" />
				</Ink.Provider>
			</Pressable>
		);
	else if (onOpen)
		line = (
			<Pressable
				accessibilityRole="button"
				onPress={onOpen}
				className={cn(MESSAGE_OPEN, OPEN)}
			>
				{words}
				{time}
				<Ink.Provider value="ink-meta">
					<Icon name="ChevronRight" fit="meta" />
				</Ink.Provider>
			</Pressable>
		);
	const centred = (
		<View className={cn(message({ author: "system" }), SYSTEM)}>
			{line}
			{detail?.code === undefined ? null : (
				<RNText
					className={cn(text({ role: "code" }), MESSAGE_CODE, DETAIL_TEXT)}
				>
					{detail.code}
				</RNText>
			)}
			{detail?.fold === undefined || !open ? null : (
				<RNText
					className={cn(text({ role: "meta" }), MESSAGE_FOLD, DETAIL_TEXT)}
				>
					{detail.fold}
				</RNText>
			)}
		</View>
	);
	if (detail?.row === undefined) return centred;
	return (
		<View className={MESSAGE_ENTRY}>
			{centred}
			<View className={cn(CARD, FRAMED)}>
				<RowBase {...detail.row} />
			</View>
		</View>
	);
}

// One turn as every Message draws it: a thread's `Message`, or `painted` (the
// other author's reply while a thread's items are not here: its head, the
// name's filler and the time's, over one clipped line of filler where `name`
// is set, else that line over the time's filler, inert). A named turn's time
// stands in its head beside the name; another's unnamed turn stands its time
// under it, as yours does. Memoised on its props:
// a thread's re-render skips each message whose author, body and time are
// unchanged. Outside the package's exports.
export const MessageBase = memo(function MessageBase(
	props: Message | { painted: true; name?: boolean; at?: number },
) {
	// Painted, a reply stands as a short loaded one does: its head (the name's
	// filler and the time's) over one clipped line where the thread names its
	// authors, else the line over the time's filler, so a log of short replies
	// paints at its loaded height.
	if ("painted" in props) {
		const stamp = (
			<PaintText
				fills="figure"
				painted
				numberOfLines={1}
				className={cn(text({ role: "meta" }), FIGURES, TIME)}
			>
				<Painted role="figure" at={props.at} />
			</PaintText>
		);
		return (
			<View {...inertProps(true)} className={message({ author: "other" })}>
				{props.name ? (
					<View className={cn(MESSAGE_HEAD, HEAD)}>
						<PaintText
							fills="name"
							painted
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
								"shrink",
							)}
						>
							<Painted role="name" at={props.at} />
						</PaintText>
						{stamp}
					</View>
				) : null}
				<PaintedProse rows={1} lines={1} at={props.at} />
				{props.name ? null : <View className={HEAD}>{stamp}</View>}
			</View>
		);
	}
	const { author, body, at } = props;
	const time = at ? (
		<RNText
			numberOfLines={1}
			className={cn(text({ role: "meta" }), FIGURES, TIME)}
		>
			{moment(at)}
		</RNText>
	) : null;
	if (author === "system")
		return (
			<SystemMessage
				body={body}
				time={time}
				onOpen={props.onOpen}
				detail={props.detail}
			/>
		);
	const { name, attachments, meta } = props;
	const attached = attachments?.length ? (
		<Attachments attachments={attachments} end={author === "you"} />
	) : null;
	// The provenance leads the time, one text a middle dot apart that breaks
	// only between a part's words, never at a dot (`flowRuns`).
	const when = at && moment(at);
	const line = meta?.some(filled) ? (
		<RNText
			className={cn(
				text({ role: "meta" }),
				TRAIL,
				author === "you" && TRAIL_END,
			)}
		>
			<RunText runs={flowRuns(metaParts(meta, META_CUT))} fit="name" />
			{when ? `${META_TAIL}${when}` : null}
		</RNText>
	) : (
		time
	);
	if (author === "you")
		return (
			<View className={cn(message({ author }), YOURS)}>
				{attached}
				{body ? (
					<View className={cn(MESSAGE_BUBBLE, BUBBLE)}>
						<RNText className={text({ role: "body" })}>{body}</RNText>
					</View>
				) : null}
				{line}
			</View>
		);
	return (
		<View className={message({ author })}>
			{name ? (
				<View className={cn(MESSAGE_HEAD, HEAD)}>
					<RNText
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							"shrink",
						)}
					>
						{name}
					</RNText>
					{line}
				</View>
			) : null}
			{attached}
			{body ? (
				<Prose markdown={props.streaming ? closeOpenRuns(body) : body} />
			) : null}
			{name || !line ? null : <View className={HEAD}>{line}</View>}
		</View>
	);
});
