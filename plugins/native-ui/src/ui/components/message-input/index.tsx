import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import {
	field,
	fieldValue,
	MESSAGE_ATTACH_SLOT,
	MESSAGE_INPUT,
	MESSAGE_INPUT_FIELD,
	MESSAGE_INPUT_ROW,
	MESSAGE_INPUT_VALUE,
	MESSAGE_NOTICE_TEXT,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useRef } from "react";
import {
	AccessibilityInfo,
	Text as RNText,
	TextInput,
	View,
} from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { ActInert } from "../../lib/form";
import { useTokenColor } from "../../lib/theme";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { Chip } from "../chip";
import { IconButton } from "../icon-button";

const ROOT = "w-full";
const ROW = "flex-row items-end";
const FIELD_BOX = "justify-center grow min-w-0";
const FIELD_DISABLED = "bg-fill-disabled";
const VALUE = "py-0";
const VALUE_DISABLED = "text-ink-disabled";
const CHIPS = "flex-row flex-wrap";
// Send and Stop share one slot, so it holds the wider act's width whichever
// stands: React Native has no grid, so both stand in one column and the
// absent one keeps its width at no height, hidden from touch and from
// assistive tech. Each act stretches to the slot, so Stop's end meets Send's.
const SLOT = "shrink-0";
const ABSENT = "h-0 overflow-hidden";
const NOTICE = "flex-row items-center";
const NOTICE_TEXT = "flex-1 min-w-0";
const ATTACH_SLOT = "shrink-0";

export interface MessageInputProps extends Closed {
	// The text being written.
	value: string;
	// Hears every keystroke's value.
	onChange: (value: string) => void;
	// The files going with the message, each a chip.
	attachments?: readonly Attachment[];
	// Adds a file: the attach act stands before the text.
	onAttach?: () => void;
	// Removes an attachment by its id: each chip carries its remove act.
	onDetach?: (id: string) => void;
	// The hint drawn while the text is empty; never the field's name.
	placeholder?: string;
	// A sentence under the input, with its one act.
	notice?: Notice;
	// An answer is coming: Stop stands in Send's place and the text stays open.
	working?: boolean;
	// Sends the text; inert while it is empty. Return breaks the line.
	onSend: () => void;
	// Stops the answer; without it Stop is drawn inert.
	onStop?: () => void;
	// Nothing can be written or sent: the disabled fill and ink, the attach act
	// inert in its place.
	disabled?: boolean;
}

// One row: the attach act, the field growing upward to eight lines (its
// attachments over the text) and Send or Stop; the notice under it in the
// same columns, its sentence at the field's text.
export function MessageInput({
	value,
	onChange,
	attachments,
	onAttach,
	onDetach,
	placeholder,
	notice,
	working,
	onSend,
	onStop,
	disabled,
}: MessageInputProps) {
	const words = useWords();
	// A placeholder's colour is a prop, never a class: `FIELD_PLACEHOLDER`'s ink.
	const placeholderInk = useTokenColor("--color-ink-meta");
	const textField = useRef<TextInput>(null);
	const sendable = value.trim() !== "" && !working && !disabled;
	// The keyboard stays on the text after Send and Stop.
	const send = () => {
		onSend();
		textField.current?.focus();
	};
	const stop = () => {
		onStop?.();
		textField.current?.focus();
	};
	// Each chip's remove act, by attachment id.
	const removes = useRef(new Map<string, View>());
	// Focus never drops to the screen: a removed chip hands the screen
	// reader's focus to the next chip's remove, else the previous one's, else
	// the text.
	const detach = (id: string, index: number) => {
		const ids = attachments?.map((attachment) => attachment.id) ?? [];
		const near = ids[index + 1] ?? ids[index - 1];
		const next = near === undefined ? undefined : removes.current.get(near);
		onDetach?.(id);
		if (next) AccessibilityInfo.sendAccessibilityEvent(next, "focus");
		else textField.current?.focus();
	};
	const slotAct = (absent: boolean, act: ReactNode) => (
		<View
			pointerEvents={absent ? "none" : "auto"}
			accessibilityElementsHidden={absent}
			importantForAccessibility={absent ? "no-hide-descendants" : "auto"}
			className={absent ? ABSENT : undefined}
		>
			{act}
		</View>
	);
	return (
		<View className={cn(MESSAGE_INPUT, ROOT)}>
			<View className={cn(MESSAGE_INPUT_ROW, ROW)}>
				{/* A disabled input keeps its attach act, inert, so the field stands at one x and width in both forms. */}
				{onAttach ? (
					<FieldDisabled.Provider value={disabled === true}>
						<IconButton
							icon="Paperclip"
							fit="bar"
							label={words.attach}
							onAct={onAttach}
						/>
					</FieldDisabled.Provider>
				) : null}
				<View
					className={cn(
						field({ fit: "bar", trailing: "none", state: "rest" }),
						MESSAGE_INPUT_FIELD,
						FIELD_BOX,
						disabled && FIELD_DISABLED,
					)}
				>
					{attachments && attachments.length > 0 ? (
						<View className={cn(MESSAGE_INPUT_ROW, CHIPS)}>
							{attachments.map((attachment, index) => (
								<Chip
									key={attachment.id}
									ref={(node: View | null) => {
										if (node) removes.current.set(attachment.id, node);
										else removes.current.delete(attachment.id);
									}}
									family="neutral"
									label={attachment.name}
									onRemove={onDetach && (() => detach(attachment.id, index))}
								/>
							))}
						</View>
					) : null}
					<TextInput
						ref={textField}
						multiline
						accessibilityLabel={words.message}
						accessibilityHint={notice?.sentence}
						accessibilityState={{ disabled }}
						editable={!disabled}
						value={value}
						onChangeText={onChange}
						placeholder={placeholder}
						placeholderTextColor={placeholderInk}
						className={cn(
							fieldValue({ kind: "text" }),
							MESSAGE_INPUT_VALUE,
							VALUE,
							disabled && VALUE_DISABLED,
						)}
					/>
				</View>
				<View className={SLOT}>
					{slotAct(
						working === true,
						<ActInert.Provider value={!sendable}>
							<Button act="primary" fit="bar" label={words.send} onAct={send} />
						</ActInert.Provider>,
					)}
					{slotAct(
						!working,
						<ActInert.Provider value={!onStop}>
							<Button
								act="secondary"
								fit="bar"
								label={words.stop}
								onAct={stop}
							/>
						</ActInert.Provider>,
					)}
				</View>
			</View>
			{notice ? (
				<View className={cn(MESSAGE_INPUT_ROW, NOTICE)}>
					{onAttach ? (
						<View
							accessibilityElementsHidden
							importantForAccessibility="no-hide-descendants"
							className={cn(MESSAGE_ATTACH_SLOT, ATTACH_SLOT)}
						/>
					) : null}
					<RNText
						className={cn(
							text({ role: "meta" }),
							MESSAGE_NOTICE_TEXT,
							NOTICE_TEXT,
						)}
					>
						{notice.sentence}
					</RNText>
					{notice.act ? (
						<Button
							act="secondary"
							fit="bar"
							label={notice.act.label}
							onAct={notice.act.onAct}
							loading={notice.act.loading}
							blocked={notice.act.blocked}
						/>
					) : null}
				</View>
			) : null}
		</View>
	);
}
