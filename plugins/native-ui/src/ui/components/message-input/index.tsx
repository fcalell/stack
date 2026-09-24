import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import {
	COUNT,
	FIELD_PLACEHOLDER,
	field,
	text,
} from "@fcalell/ui-core/variants";
import { ArrowUp, Plus, Square } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";

export interface MessageInputProps extends Closed {
	value: string;
	onChange: (value: string) => void;
	attachments?: readonly Attachment[];
	onAttach?: () => void;
	placeholder?: string;
	notice?: Notice;
	working?: boolean;
	onSend: () => void;
	onStop?: () => void;
}

// A plus for files, the text in a pill, one circle that sends or stops.
// Dictation is the keyboard's.
export function MessageInput({
	value,
	onChange,
	attachments,
	onAttach,
	placeholder,
	notice,
	working,
	onSend,
	onStop,
}: MessageInputProps) {
	const words = useWords();
	const [focused, setFocused] = useState(false);
	const empty = value.trim().length === 0;
	return (
		<View className="gap-row">
			{attachments && attachments.length > 0 ? (
				<View className="flex-row flex-wrap gap-row">
					{attachments.map((attachment) => (
						<RNText key={attachment.id} className={COUNT}>
							{attachment.name}
						</RNText>
					))}
				</View>
			) : null}
			<View className="flex-row items-end gap-row">
				{onAttach ? (
					<Circle icon={Plus} label={words.attach} onAct={onAttach} />
				) : null}
				<TextInput
					multiline
					className={cn(
						field({ kind: "search", state: focused ? "focused" : "default" }),
						text({ role: "body" }),
						"flex-1 py-2",
					)}
					placeholderTextColorClassName={FIELD_PLACEHOLDER}
					value={value}
					onChangeText={onChange}
					placeholder={placeholder}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
				/>
				{working ? (
					<Circle
						icon={Square}
						label={words.stop}
						onAct={onStop ?? (() => {})}
						disabled={!onStop}
					/>
				) : (
					<Circle
						icon={ArrowUp}
						label={words.send}
						onAct={onSend}
						disabled={empty}
					/>
				)}
			</View>
			{notice ? (
				<View className="flex-row items-center gap-row">
					<RNText className={cn(text({ role: "meta" }), "flex-1")}>
						{notice.sentence}
					</RNText>
					{notice.act ? (
						<Pressable
							accessibilityRole="button"
							disabled={notice.act.blocked !== undefined}
							onPress={notice.act.onAct}
							className="min-h-11 justify-center"
						>
							<RNText
								className={cn(text({ role: "meta" }), "font-medium text-tint")}
							>
								{notice.act.label}
							</RNText>
						</Pressable>
					) : null}
				</View>
			) : null}
		</View>
	);
}
