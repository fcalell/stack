import { cn } from "@fcalell/ui-core/cn";
import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import {
	field,
	fieldValue,
	MESSAGE_ATTACH_SLOT,
	MESSAGE_INPUT,
	MESSAGE_INPUT_BOX,
	MESSAGE_INPUT_CHIPS,
	MESSAGE_INPUT_FIELD,
	MESSAGE_INPUT_FOOT,
	MESSAGE_INPUT_ROW,
	MESSAGE_INPUT_TEXT,
	MESSAGE_INPUT_VALUE,
	MESSAGE_NOTICE,
	MESSAGE_NOTICE_TEXT,
	text,
} from "@fcalell/ui-core/variants";
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldDisabled } from "../../lib/field.ts";
import { ActInert } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Chip } from "../chip/index.tsx";
import { IconButton } from "../icon-button/index.tsx";

const ROOT = "flex flex-col w-full";
const STACK = "flex flex-col";
// The box draws the field's states, as `Input`'s does: the acts inside it
// answer their own pointer and ring on their own focus.
const BOX_HOVER = "not-has-[button:hover]:hover:border-edge-hover";
const BOX_FOCUS =
	"not-has-[button:focus-visible]:has-focus-visible:outline-2 not-has-[button:focus-visible]:has-focus-visible:outline-offset-2 not-has-[button:focus-visible]:has-focus-visible:outline-ring";
const BOX_DISABLED = "bg-fill-disabled";
const FIELD_BOX = "flex flex-col justify-center grow min-w-0";
const VALUE =
	"block w-full resize-none field-sizing-content overflow-y-auto outline-none placeholder:text-ink-meta disabled:text-ink-disabled disabled:placeholder:text-ink-disabled";
const ROW = "flex items-end";
const CHIPS = "flex flex-wrap";
const FOOT = "flex items-center";
const SPACER = "grow";
// Send and Stop share one cell, the absent one invisible, so the slot holds
// the wider act's width whichever stands.
const SLOT = "grid shrink-0";
// Each act stretches to the slot, so Stop's end meets Send's.
const SLOT_ACT = "grid col-start-1 row-start-1";
const ABSENT = "invisible";
const NOTICE = "flex items-center";
const NOTICE_TEXT = "grow min-w-0";
const ATTACH_SLOT = "shrink-0";

/** Where a message is written and sent. */
export interface MessageInputProps extends Closed {
	/** The text being written. */
	value: string;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** The files going with the message, each a chip. */
	attachments?: readonly Attachment[];
	/** Adds a file: the attach act stands before the text. */
	onAttach?: () => void;
	/** Removes an attachment by its id: each chip carries its remove act. */
	onDetach?: (id: string) => void;
	/** The hint drawn while the text is empty; never the field's name. */
	placeholder?: string;
	/** A sentence under the input, with its one act. */
	notice?: Notice;
	/** An answer is coming: Stop stands in Send's place and the text stays open. */
	working?: boolean;
	/** Sends the text; inert while it is empty. Enter sends on the desktop, Shift+Enter breaks the line. */
	onSend: () => void;
	/** Stops the answer; without it Stop is drawn inert. */
	onStop?: () => void;
	/** Nothing can be written or sent: the disabled fill and ink, the attach act inert in its place. */
	disabled?: boolean;
}

/** On the desktop one box (its attachments, the text growing to eight lines and scrolling past them, then the attach act and Send or Stop), the notice under it at the text's x; on touch one row (attach, the field growing upward, Send or Stop), the notice under it in the same columns. */
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
	const touch = useTouch();
	const empty = value.trim() === "";
	const sendable = !empty && !working && !disabled;
	const textField = useRef<HTMLTextAreaElement>(null);
	const chipRow = useRef<HTMLDivElement>(null);
	const noticeId = useId();
	// Focus never drops to the page: Send and Stop hand it to the text, a
	// removed chip to the next chip's remove, else the previous one's.
	const send = () => {
		onSend();
		textField.current?.focus();
	};
	const stop = () => {
		onStop?.();
		textField.current?.focus();
	};
	const detach = (id: string, index: number) => {
		const removes = chipRow.current?.querySelectorAll("button") ?? [];
		const next = removes[index + 1] ?? removes[index - 1] ?? textField.current;
		onDetach?.(id);
		next?.focus();
	};
	// A phone's return key breaks the line; the desktop's sends.
	const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (touch || event.key !== "Enter" || event.shiftKey) return;
		if (event.nativeEvent.isComposing) return;
		event.preventDefault();
		if (sendable) send();
	};
	const box = cn(BOX_FOCUS, disabled ? BOX_DISABLED : BOX_HOVER);
	// A disabled input keeps its attach act, inert, so the field stands at one
	// x and width in both forms.
	const attach = onAttach ? (
		<FieldDisabled value={disabled === true}>
			<IconButton
				icon="Paperclip"
				fit="bar"
				label={words.attach}
				onAct={onAttach}
			/>
		</FieldDisabled>
	) : null;
	const chips =
		attachments && attachments.length > 0
			? attachments.map((attachment, index) => (
					<Chip
						key={attachment.id}
						family="neutral"
						label={attachment.name}
						onRemove={onDetach && (() => detach(attachment.id, index))}
					/>
				))
			: null;
	const textarea = (
		<textarea
			ref={textField}
			aria-describedby={notice ? noticeId : undefined}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={keyDown}
			aria-label={words.message}
			placeholder={placeholder}
			disabled={disabled}
			className={cn(fieldValue({ kind: "text" }), MESSAGE_INPUT_VALUE, VALUE)}
		/>
	);
	const acts = (
		<div className={SLOT}>
			<span className={cn(SLOT_ACT, working && ABSENT)}>
				<ActInert value={!sendable}>
					<Button act="primary" fit="bar" label={words.send} onAct={send} />
				</ActInert>
			</span>
			<span className={cn(SLOT_ACT, !working && ABSENT)}>
				<ActInert value={!onStop}>
					<Button act="secondary" fit="bar" label={words.stop} onAct={stop} />
				</ActInert>
			</span>
		</div>
	);
	const act = notice?.act ? (
		<Button
			act="secondary"
			fit="bar"
			label={notice.act.label}
			onAct={notice.act.onAct}
			loading={notice.act.loading}
			blocked={notice.act.blocked}
		/>
	) : null;
	let input: ReactNode;
	let under: ReactNode = null;
	if (touch) {
		input = (
			<div className={cn(MESSAGE_INPUT_ROW, ROW)}>
				{attach}
				<div
					className={cn(
						field({ fit: "bar", trailing: "none", state: "rest" }),
						MESSAGE_INPUT_FIELD,
						FIELD_BOX,
						box,
					)}
				>
					{chips ? (
						<div ref={chipRow} className={cn(MESSAGE_INPUT_ROW, CHIPS)}>
							{chips}
						</div>
					) : null}
					{textarea}
				</div>
				{acts}
			</div>
		);
		if (notice)
			under = (
				<div className={cn(MESSAGE_INPUT_ROW, NOTICE)}>
					{attach ? (
						<span
							aria-hidden
							className={cn(MESSAGE_ATTACH_SLOT, ATTACH_SLOT)}
						/>
					) : null}
					<p
						id={noticeId}
						className={cn(
							text({ role: "meta" }),
							MESSAGE_NOTICE_TEXT,
							NOTICE_TEXT,
						)}
					>
						{notice.sentence}
					</p>
					{act}
				</div>
			);
	} else {
		input = (
			<div className={cn(MESSAGE_INPUT_BOX, STACK, box)}>
				{chips ? (
					<div ref={chipRow} className={cn(MESSAGE_INPUT_CHIPS, CHIPS)}>
						{chips}
					</div>
				) : null}
				<div className={MESSAGE_INPUT_TEXT}>{textarea}</div>
				<div className={cn(MESSAGE_INPUT_FOOT, FOOT)}>
					{attach}
					<span className={SPACER} />
					{acts}
				</div>
			</div>
		);
		if (notice)
			under = (
				<div className={cn(MESSAGE_NOTICE, NOTICE)}>
					<p id={noticeId} className={cn(text({ role: "meta" }), NOTICE_TEXT)}>
						{notice.sentence}
					</p>
					{act}
				</div>
			);
	}
	return (
		<div className={cn(MESSAGE_INPUT, ROOT)}>
			{input}
			{under}
		</div>
	);
}
