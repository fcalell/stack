import {
	lineBox,
	MESSAGE_BUBBLE,
	MESSAGE_HEAD,
	MESSAGE_LINE,
	MESSAGE_OPEN,
	message,
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { moment } from "../../lib/moment";
import { Icon } from "../icon";
import { Prose } from "../prose";

const YOURS = "items-end";
const SYSTEM = "items-center justify-center";
const LINE_TEXT = "flex-row flex-wrap justify-center min-w-0";
// A React Native text never shrinks in a row unless told, so a long line
// wraps inside the row instead of running past it.
const WORDS = "shrink min-w-0 text-center";
const OPEN = "flex-row items-center min-w-0 active:bg-wash-press";
const HEAD = "flex-row items-baseline";
const BUBBLE = "max-w-4/5";
// A time reads as one unit: it never shrinks or breaks beside a long line.
const TIME = "shrink-0";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading turn keeps the loaded one's height.
const LINE = "flex-row items-center";
const STRUT = "​";
// A loading reply: one paragraph of three lines, each bar at its line's length.
const REPLY_BARS = ["w-full", "w-full", "w-2/3"] as const;

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
			// Who said it: drawn over `other`'s reply, read aloud before yours.
			name?: string;
			onOpen?: never;
	  })
	| (MessageBase & {
			author: "system";
			// Opens what the line names: the line becomes the act, a chevron
			// after it.
			onOpen?: () => void;
			name?: never;
	  });

function LineWait({ role, bar }: { role: "body" | "meta"; bar: string }) {
	return (
		<View className={LINE}>
			<RNText className={lineBox({ role })}>{STRUT}</RNText>
			<View className={cn(skeleton({ kind: "line" }), bar)} />
		</View>
	);
}

// Yours a bubble on the group ground at the column's end, the time under it;
// another's the name at body 500 beside the time over the reply as Prose; a
// system line one meta line centred in a row at the target height, its time
// beside it.
export function Message(props: MessageProps) {
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
						<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
						<View className={cn(skeleton({ kind: "line" }), "w-full")} />
					</View>
				</View>
			);
		const words = (
			<RNText className={cn(text({ role: "meta" }), WORDS)}>{body}</RNText>
		);
		return (
			<View className={cn(message({ author }), SYSTEM)}>
				{props.onOpen ? (
					<Pressable
						accessibilityRole="button"
						onPress={props.onOpen}
						className={cn(MESSAGE_OPEN, OPEN)}
					>
						{words}
						{time}
						<Ink.Provider value="ink-meta">
							<Icon name="ChevronRight" fit="meta" />
						</Ink.Provider>
					</Pressable>
				) : (
					<View className={cn(MESSAGE_LINE, LINE_TEXT)}>
						{words}
						{time}
					</View>
				)}
			</View>
		);
	}
	const { name } = props;
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
				</View>
			);
		// React Native has no visually hidden text: the speaker is read before
		// the words as part of the bubble's name.
		return (
			<View className={cn(message({ author }), YOURS)}>
				<View className={cn(MESSAGE_BUBBLE, BUBBLE)}>
					<RNText
						accessibilityLabel={name ? `${name}, ${body}` : undefined}
						className={text({ role: "body" })}
					>
						{body}
					</RNText>
				</View>
				{time}
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
			{name || time ? (
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
					{time}
				</View>
			) : null}
			<Prose markdown={body} />
		</View>
	);
}
