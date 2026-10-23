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
	MESSAGE_INPUT_FIELD_CHIPS,
	MESSAGE_INPUT_ROW,
	MESSAGE_INPUT_VALUE,
	MESSAGE_NOTICE_TEXT,
	text,
} from "@fcalell/ui-core/variants";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useRef, useState } from "react";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import { asAct, useAct, wiringOf } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { FootReturn } from "../../lib/frame";
import { FadingView, lineIn } from "../../lib/motion";
import { pickedFromDocument, pickedFromImage } from "../../lib/picked";
import { useTokenColor } from "../../lib/theme";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { ButtonBase } from "../button/base";
import { IconButtonBase } from "../button/glyph";
import { MenuSheet } from "../menu/sheet";
import { Attachments } from "../message/attachments";

const ROOT = "w-full";
const ROW = "flex-row items-end";
const FIELD_BOX = "justify-center grow min-w-0";
const FIELD_DISABLED = "bg-fill-disabled";
// The text fills the field's height beside the chips, its inset its own.
const VALUE = "grow";
const VALUE_DISABLED = "text-ink-disabled";
const NOTICE = "flex-row items-center";
const NOTICE_TEXT = "flex-1 min-w-0";
const ATTACH_SLOT = "shrink-0";

export interface MessageInputProps extends Closed {
	/** The text being written (text; wraps). */
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
	/** The hint drawn while the text is empty; never the field's name (a short phrase; wraps). */
	placeholder?: string;
	// A sentence under the input, with its one act.
	notice?: Notice;
	// An answer is coming: Stop stands before Send, and Send still sends.
	working?: boolean;
	// Sends the text; inert while it is empty. Return breaks the line.
	onSend: () => unknown;
	// Stops the answer; without it Stop is drawn inert.
	onStop?: () => unknown;
	// Nothing can be written or sent: the disabled fill and ink, the attach act
	// inert in its place.
	disabled?: boolean;
}

// One row: the attach act, the field growing upward to eight lines (its
// attachments over the text), Stop's icon act while an answer comes and
// Send's icon act; the notice under it in the same columns, its sentence at the field's
// text. A Thread's `composer`; outside the package's exports.
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
	const noticed = notice?.act ? asAct(notice.act) : undefined;
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
	// Send and Stop hold their handler's promise: the pressed one pends, and a
	// rejection toasts with Retry.
	const acting = useAct<"send" | "stop">("toast");
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
						<Button
							glyph
							icon="Paperclip"
							label={words.attach}
							onAct={() => setChoosing(true)}
						/>
					</FieldDisabled.Provider>
				) : null}
				{/* A press on the field outside its chips puts the focus in the text; the text is the one control. */}
				<Pressable
					accessible={false}
					onPress={() => textField.current?.focus()}
					className={cn(
						field({ trailing: "none", state: "rest" }),
						FIELD_BOX,
						disabled && FIELD_DISABLED,
					)}
				>
					{attachments && attachments.length > 0 ? (
						<View className={MESSAGE_INPUT_FIELD_CHIPS}>
							<Attachments attachments={attachments} onRemove={onDetach} />
						</View>
					) : null}
					<TextInput
						ref={textField}
						multiline
						accessibilityLabel={words.message}
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
				</Pressable>
				{/* Stop and Send are icon acts, so the field keeps its width; Stop's glyph is the stop square in a ring, never a bare square a checkbox would read as. */}
				{working ? (
					<IconButtonBase
						icon="CircleStop"
						label={words.stop}
						onAct={() => acting.run("stop", { onAct: () => onStop?.() })}
						pending={acting.pending === "stop"}
						disabled={!onStop}
					/>
				) : null}
				<IconButtonBase
					icon="Send"
					label={words.send}
					onAct={() => acting.run("send", { onAct: onSend })}
					pending={acting.pending === "send"}
					disabled={!sendable}
				/>
			</View>
			{notice ? (
				<FadingView
					entering={lineIn()}
					className={cn(MESSAGE_INPUT_ROW, NOTICE)}
				>
					{onAttach ? (
						<View className={cn(MESSAGE_ATTACH_SLOT, ATTACH_SLOT)} />
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
					{noticed ? (
						<ButtonBase
							act="secondary"
							label={noticed.label}
							onAct={noticed.onAct}
							blocked={noticed.blocked}
							{...wiringOf(noticed)}
						/>
					) : null}
				</FadingView>
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
