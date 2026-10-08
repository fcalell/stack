import type {
	Attachment,
	MessageDetail,
	Part,
} from "@fcalell/ui-core/descriptors";
import {
	MESSAGE_BUBBLE,
	MESSAGE_CARD,
	MESSAGE_CODE,
	MESSAGE_ENTRY,
	MESSAGE_FOLD,
	MESSAGE_HEAD,
	MESSAGE_LINE,
	MESSAGE_OPEN,
	message,
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { memo, type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { moment } from "../../lib/moment";
import { joinParts, META_CUT } from "../../lib/parts";
import { Strut } from "../../lib/strut";
import { Icon } from "../icon";
import { ListRow } from "../list-row";
import { Prose } from "../prose";
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
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading turn keeps the loaded one's height.
const LINE = "flex-row items-center";
// A loading reply: one paragraph of three lines, each bar at its line's length.
const REPLY_BARS = ["w-full", "w-full", "w-2/3"] as const;
// A loading time: four figures, as the time it stands in for.
const TIME_BAR = "w-figures";

interface MessageBase extends Closed {
	// What was said: plain text for `you` and `system`, markdown for `other`.
	body: string;
	// When it was said, an ISO moment: drawn as the time today, else the date
	// and time.
	at?: string;
	// The message waits: its author's form as bars in their line boxes.
	loading?: boolean;
}

export type MessageProps =
	| (MessageBase & {
			author: "you" | "other";
			// Who said it: drawn over `other`'s reply.
			name?: string;
			// What came with it, one row over the bubble (yours at the column's
			// end) or the reply: an attachment with `src` a thumbnail that opens
			// full size, one without a chip of its name.
			attachments?: readonly Attachment[];
			// Where it came from ("by voice", "Kitchen"), joined by a middle dot
			// before the time.
			meta?: readonly Part[];
			onOpen?: never;
			detail?: never;
	  })
	| (MessageBase & {
			author: "system";
			// Opens what the line names: the line becomes the act, a chevron
			// after it.
			onOpen?: () => void;
			// What stands under the line, one of three: a row in a hairline card
			// that opens its record, a free act's arguments in the code role, or
			// lines the line opens in place (it takes no `onOpen` then).
			detail?: MessageDetail;
			name?: never;
			attachments?: never;
			meta?: never;
	  });

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
				<GroundContext.Provider value="group">
					<ListRow {...detail.row} />
				</GroundContext.Provider>
			</View>
		</View>
	);
}

function LineWait({ role, bar }: { role: "body" | "meta"; bar: string }) {
	return (
		<View className={LINE}>
			<Strut role={role} />
			<View className={cn(skeleton({ kind: "line" }), bar)} />
		</View>
	);
}

// Yours a bubble on the group ground at the column's end, its attachments in
// one row over it, its provenance line and the time under it;
// another's the name at body 500 beside the provenance and the time over its
// attachments and the reply as Prose; a
// system line one meta line centred in a row at the target height, its time
// beside it.
// Memoised on its props: a thread's re-render skips each message whose
// author, body and time are unchanged.
export const Message = memo(function Message(props: MessageProps) {
	const { author, body, at, loading } = props;
	const time = at ? (
		<RNText numberOfLines={1} className={cn(text({ role: "meta" }), TIME)}>
			{moment(at)}
		</RNText>
	) : null;
	if (author === "system") {
		if (loading)
			return (
				<View
					accessibilityState={{ busy: true }}
					className={cn(message({ author }), SYSTEM)}
				>
					<View className={cn(LINE, "w-1/3")}>
						<Strut role="meta" />
						<View className={cn(skeleton({ kind: "line" }), "w-full")} />
					</View>
				</View>
			);
		return (
			<SystemMessage
				body={body}
				time={time}
				onOpen={props.onOpen}
				detail={props.detail}
			/>
		);
	}
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
	if (author === "you") {
		if (loading)
			return (
				<View
					accessibilityState={{ busy: true }}
					className={cn(message({ author }), YOURS)}
				>
					<View className={cn(MESSAGE_BUBBLE, "w-1/2")}>
						<LineWait role="body" bar="w-full" />
					</View>
					<LineWait role="meta" bar={TIME_BAR} />
				</View>
			);
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
	}
	if (loading)
		return (
			<View accessibilityState={{ busy: true }} className={message({ author })}>
				<LineWait role="body" bar="w-1/5" />
				<View>
					{REPLY_BARS.map((bar, line) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
						<LineWait key={line} role="body" bar={bar} />
					))}
				</View>
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
							)}
						>
							{name}
						</RNText>
					) : null}
					{line}
				</View>
			) : null}
			{attached}
			{body ? <Prose markdown={body} /> : null}
		</View>
	);
});
