import { THREAD, THREAD_FOOT, THREAD_LOG } from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";
import { ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FootDocks, ThreadFills } from "../../lib/frame";

// The column the log and the docked input share, lifted over the keyboard.
const Fill = withUniwind(KeyboardAvoidingView);

const FILL = "flex-1";
const LOG = "flex-1";
const DOCKED = "shrink-0";
// The log is at its end while its last point shows; a reader who scrolled
// up keeps their place as a message arrives.
const AT_END = 1;

export interface ThreadProps extends Closed {
	// The `Message`s, oldest first.
	children?: ReactNode;
	// The `MessageInput` under the messages.
	foot?: ReactNode;
}

// The messages a sections gap apart, one rung above a reply's block gap, and
// the input a sections gap under them, in the screen's column (native draws
// the touch structure, so no measure-wide column). In a Place's body it
// fills the page: the log scrolls at the page inset, opening at the newest
// message and following each that arrives while the reader is at the end,
// the input docked at the foot over the keyboard. React Native has no log
// role: the messages are a polite live region, so an arriving one is
// announced (Android; VoiceOver reads them in order).
export function Thread({ children, foot }: ThreadProps) {
	const fills = useContext(ThreadFills);
	const docks = useContext(FootDocks);
	const log = useRef<ScrollView>(null);
	const atEnd = useRef(true);
	useLayoutEffect(() => {
		if (!fills) return;
		fills(true);
		return () => fills(false);
	}, [fills]);
	// The log opens at its end and stays there while the reader is, as a
	// message arrives, a reply grows, or the input or the keyboard shrinks
	// the log.
	const follow = () => {
		if (atEnd.current) log.current?.scrollToEnd({ animated: false });
	};
	// The docked foot's height, the room the Shell's toasts stand above; its
	// layout reports it, and leaving takes it back.
	useEffect(() => {
		if (!docks) return;
		return () => docks(0);
	}, [docks]);
	const messages = (
		<View accessibilityLiveRegion="polite" className={THREAD}>
			{children}
		</View>
	);
	if (!fills)
		return (
			<View className={THREAD}>
				{messages}
				{foot ?? null}
			</View>
		);
	return (
		<Fill behavior="padding" automaticOffset className={FILL}>
			<ScrollView
				ref={log}
				onContentSizeChange={follow}
				onLayout={follow}
				onScroll={(event) => {
					const { contentOffset, contentSize, layoutMeasurement } =
						event.nativeEvent;
					atEnd.current =
						contentSize.height - contentOffset.y - layoutMeasurement.height <=
						AT_END;
				}}
				className={LOG}
				contentContainerClassName={THREAD_LOG}
			>
				{messages}
			</ScrollView>
			{foot ? (
				<View
					onLayout={(event) => docks?.(event.nativeEvent.layout.height)}
					className={cn(THREAD_FOOT, DOCKED)}
				>
					{foot}
				</View>
			) : null}
		</Fill>
	);
}
