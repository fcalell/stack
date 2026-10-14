import type { MessageDetail } from "@fcalell/ui-core/descriptors";
import { closeOpenRuns } from "@fcalell/ui-core/streaming";
import {
	FIGURES,
	MESSAGE_BUBBLE,
	MESSAGE_CARD,
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
import { Ink } from "../../lib/ink";
import { moment } from "../../lib/moment";
import { inertProps, Painted } from "../../lib/paint";
import { joinParts, META_CUT } from "../../lib/parts";
import { Icon } from "../icon";
import { ListRow } from "../list-row";
import { Prose } from "../prose";
import { PaintedProse } from "../prose/painted";
import { Attachments } from "./attachments";
import type { MessageProps } from "./index";

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
					<Icon name={open ? "ChevronDown" : "ChevronRight"} fit="meta" />
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
			<View className={cn(MESSAGE_CARD, FRAMED)}>
				<ListRow {...detail.row} />
			</View>
		</View>
	);
}

// One turn as every Message draws it: the public `Message`, or `painted` (the
// other author's reply while a thread's items are not here: the name's filler
// when `name` is set and a paragraph of filler, inert). Memoised on its props:
// a thread's re-render skips each message whose author, body and time are
// unchanged. Outside the package's exports.
export const MessageBase = memo(function MessageBase(
	props: MessageProps | { painted: true; name?: boolean; at?: number },
) {
	if ("painted" in props)
		return (
			<View {...inertProps(true)} className={message({ author: "other" })}>
				{props.name ? (
					<View className={cn(MESSAGE_HEAD, HEAD)}>
						<RNText
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
								"shrink",
							)}
						>
							<Painted role="name" at={props.at} />
						</RNText>
					</View>
				) : null}
				<PaintedProse rows={1} at={props.at} />
			</View>
		);
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
	// The provenance leads the time, one unit that wraps at its dots.
	const line = meta?.length ? (
		<RNText
			className={cn(
				text({ role: "meta" }),
				TRAIL,
				author === "you" && TRAIL_END,
			)}
		>
			{[joinParts(meta, META_CUT), at && moment(at)]
				.filter(Boolean)
				.join(" · ")}
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
			{name || line ? (
				<View className={cn(MESSAGE_HEAD, HEAD)}>
					{name ? (
						<RNText
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
								"shrink",
							)}
						>
							{name}
						</RNText>
					) : null}
					{line}
				</View>
			) : null}
			{attached}
			{body ? (
				<Prose markdown={props.streaming ? closeOpenRuns(body) : body} />
			) : null}
		</View>
	);
});
