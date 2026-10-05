import type {
	Attachment,
	Notice,
	PickedFile,
} from "@fcalell/ui-core/descriptors";
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
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useRef, useState } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { ActInert } from "../../lib/form";
import { FootReturn } from "../../lib/frame";
import { pickedFromDocument, pickedFromImage } from "../../lib/picked";
import { useTokenColor } from "../../lib/theme";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButton } from "../icon-button";
import { IconButtonBase } from "../icon-button/base";
import { MenuSheet } from "../menu/sheet";
import { Attachments } from "../message/attachments";

const ROOT = "w-full";
const ROW = "flex-row items-end";
const FIELD_BOX = "justify-center grow min-w-0";
const FIELD_DISABLED = "bg-fill-disabled";
const VALUE = "py-0";
const VALUE_DISABLED = "text-ink-disabled";
const NOTICE = "flex-row items-center";
const NOTICE_TEXT = "flex-1 min-w-0";
const ATTACH_SLOT = "shrink-0";

export interface MessageInputProps extends Closed {
	// The text being written.
	value: string;
	// Hears every keystroke's value.
	onChange: (value: string) => void;
	// The files going with the message: an attachment with `src` a thumbnail,
	// one without a chip of its name.
	attachments?: readonly Attachment[];
	// Hears the files the viewer brings: the attach act stands before the text
	// and offers the photo library or the files. A paste into the text brings
	// nothing, since React Native's `TextInput` hands over no pasted image.
	// Turn each file into an `Attachment` and pass it back.
	onAttach?: (files: readonly PickedFile[]) => void;
	// Removes an attachment by its id: each carries its remove act.
	onDetach?: (id: string) => void;
	// The hint drawn while the text is empty; never the field's name.
	placeholder?: string;
	// A sentence under the input, with its one act.
	notice?: Notice;
	// An answer is coming: Stop stands before Send, and Send still sends.
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
// attachments over the text), Stop's icon act while an answer comes and
// Send; the notice under it in the same columns, its sentence at the field's
// text.
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
	const returned = useContext(FootReturn);
	// The input that returns where a docked sheet closed takes focus.
	useEffect(() => {
		if (!returned?.current) return;
		returned.current = false;
		textField.current?.focus();
	}, [returned]);
	const [choosing, setChoosing] = useState(false);
	const sendable = value.trim() !== "" && !disabled;
	const photos = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsMultipleSelection: true,
		});
		if (!result.canceled) onAttach?.(result.assets.map(pickedFromImage));
	};
	const files = async () => {
		const result = await DocumentPicker.getDocumentAsync({
			type: "*/*",
			multiple: true,
		});
		if (!result.canceled) onAttach?.(result.assets.map(pickedFromDocument));
	};
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
							onAct={() => setChoosing(true)}
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
						<Attachments
							attachments={attachments}
							onRemove={onDetach}
							fallback={textField}
						/>
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
				{/* Stop is an icon act, so the field keeps its width; its glyph is the stop square in a ring, never a bare square a checkbox would read as. */}
				{working ? (
					<IconButtonBase
						icon="CircleStop"
						fit="bar"
						label={words.stop}
						onAct={() => onStop?.()}
						disabled={!onStop}
					/>
				) : null}
				<ActInert.Provider value={!sendable}>
					<Button act="primary" fit="bar" label={words.send} onAct={onSend} />
				</ActInert.Provider>
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
			{onAttach ? (
				<MenuSheet
					label={words.attach}
					title={words.attach}
					items={[
						{ label: words.photos, icon: "Image", onAct: photos },
						{ label: words.files, icon: "File", onAct: files },
					]}
					open={choosing}
					onClose={() => setChoosing(false)}
				/>
			) : null}
		</View>
	);
}
