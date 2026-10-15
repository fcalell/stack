import { cn } from "@fcalell/ui-core/cn";
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
	MESSAGE_INPUT_BOX,
	MESSAGE_INPUT_CHIPS,
	MESSAGE_INPUT_FIELD,
	MESSAGE_INPUT_FOOT,
	MESSAGE_INPUT_ROW,
	MESSAGE_INPUT_TEXT,
	MESSAGE_INPUT_VALUE,
	MESSAGE_NOTICE,
	MESSAGE_NOTICE_TEXT,
	THREAD_COLUMN,
	text,
} from "@fcalell/ui-core/variants";
import {
	type ChangeEvent,
	type ClipboardEvent,
	type DragEvent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { useAct } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { FieldDisabled } from "../../lib/field.ts";
import { ActInert } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import {
	BOX_FOCUS,
	POINTER_FOCUS_EDGE,
	useModality,
} from "../../lib/modality.ts";
import { attachedFrom } from "../../lib/picked.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Attachments } from "../message/attachments.tsx";

const ROOT = "flex flex-col w-full";
const STACK = "flex flex-col";
// The box draws the field's states, as `Input`'s does: the acts inside it
// answer their own pointer and ring on their own focus.
const BOX_HOVER = `not-has-[button:hover]:hover:border-edge-hover ${POINTER_FOCUS_EDGE}`;
const BOX_DISABLED = "bg-fill-disabled";
const FIELD_BOX = "flex flex-col justify-center grow min-w-0";
const VALUE =
	"block w-full resize-none field-sizing-content overflow-y-auto outline-none placeholder:text-ink-meta disabled:text-ink-disabled disabled:placeholder:text-ink-disabled";
const ROW = "flex items-end";
// A file dragged over the input lights its boundary as the pointer does.
const OVER = "border-edge-hover";
const FOOT = "flex items-center";
const SPACER = "grow";
// Stop, while an answer comes, and Send: the spacer holds no width to give, so
// only a label wider than the row narrows them. On touch they are icon acts the
// field gives way to.
const ACTS = "flex items-center min-w-0 max-w-full";
const ACTS_ICON = "flex items-center shrink-0";
const NOTICE = "flex items-center";
const NOTICE_TEXT = "grow shrink-10000000 min-w-0";
const ATTACH_SLOT = "shrink-0";

/** Where a message is written and sent. */
export interface MessageInputProps extends Closed {
	/** The text being written (text; wraps). */
	value: string;
	/** Hears every keystroke's value. */
	onChange: (value: string) => void;
	/** The files going with the message: an attachment with `src` a thumbnail, one without a chip of its name. */
	attachments?: readonly Attachment[];
	/** Hears the files the viewer brings: the attach act opens the system's file dialog before the text, and a file pasted into the text or dropped on the input comes the same way. Turn each into an `Attachment` and pass it back. */
	onAttach?: (files: readonly PickedFile[]) => void;
	/** Removes an attachment by its id: each carries its remove act. */
	onDetach?: (id: string) => void;
	/** The hint drawn while the text is empty; never the field's name (a short phrase; wraps). */
	placeholder?: string;
	/** A sentence under the input, with its one act. */
	notice?: Notice;
	/** An answer is coming: Stop stands before Send, and Send still sends. */
	working?: boolean;
	/** Sends the text; inert while it is empty. Enter sends on the desktop, Shift+Enter breaks the line. */
	onSend: () => unknown;
	/** Stops the answer; without it Stop is drawn inert. */
	onStop?: () => unknown;
	/** Nothing can be written or sent: the disabled fill and ink, the attach act inert in its place. */
	disabled?: boolean;
}

/** On the desktop one box (its attachments, the text growing to eight lines and scrolling past them, then the attach act, Stop while an answer comes, and Send), the notice under it at the text's x; on touch one row (attach, the field growing upward, Stop's icon act while an answer comes, Send's icon act), the notice under it in the same columns. A press anywhere in the box or field that is no act focuses the text, the caret at its end. */
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
	useModality();
	const words = useWords();
	const touch = useTouch();
	// A docked foot spans the page body, so the field keeps its own measure
	// column on the desktop.
	const column = !touch && THREAD_COLUMN;
	const empty = value.trim() === "";
	const sendable = !empty && !disabled;
	const textField = useRef<HTMLTextAreaElement>(null);
	const chooser = useRef<HTMLInputElement>(null);
	const [over, setOver] = useState(false);
	// Focus never drops to the page: Send and Stop hand it to the text, a
	// removed chip to the next chip's remove, else the previous one's.
	// Send and Stop hold their handler's promise: the pressed one pends, and a
	// rejection toasts with Retry.
	const acting = useAct<"send" | "stop">("toast");
	const sending = acting.pending === "send";
	const stopping = acting.pending === "stop";
	const send = () => {
		acting.run("send", { onAct: onSend });
		textField.current?.focus();
	};
	const stop = () => {
		acting.run("stop", { onAct: () => onStop?.() });
		textField.current?.focus();
	};
	// Every way a file arrives (the dialog, a paste, a drop) ends here.
	const take = (files: ArrayLike<File>) => {
		if (files.length > 0) onAttach?.(Array.from(files, attachedFrom));
	};
	const choose = (event: ChangeEvent<HTMLInputElement>) => {
		take(event.currentTarget.files ?? []);
		// The same file chosen again is a change the input would not report.
		event.currentTarget.value = "";
	};
	// A pasted screenshot is a file; pasted text stays the text area's, even
	// when the clipboard carries an image beside it (copied from an office
	// document).
	const paste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
		if (
			event.clipboardData.files.length === 0 ||
			event.clipboardData.getData("text/plain") !== ""
		)
			return;
		event.preventDefault();
		take(event.clipboardData.files);
	};
	const dropping =
		onAttach && !disabled
			? {
					onDragOver: (event: DragEvent<HTMLDivElement>) => {
						if (!event.dataTransfer.types.includes("Files")) return;
						event.preventDefault();
						setOver(true);
					},
					onDragLeave: (event: DragEvent<HTMLDivElement>) => {
						const next = event.relatedTarget;
						if (next instanceof Node && event.currentTarget.contains(next))
							return;
						setOver(false);
					},
					onDrop: (event: DragEvent<HTMLDivElement>) => {
						setOver(false);
						if (event.dataTransfer.files.length === 0) return;
						event.preventDefault();
						take(event.dataTransfer.files);
					},
				}
			: undefined;
	// A press on the box that lands on no act or chip puts the focus in the text,
	// the caret at its end: the box is the field, not its one line.
	const focusText = (event: MouseEvent<HTMLDivElement>) => {
		const area = textField.current;
		if (!area || event.target === area) return;
		if (event.target instanceof Element && event.target.closest("button, a"))
			return;
		event.preventDefault();
		area.focus();
		area.setSelectionRange(area.value.length, area.value.length);
	};
	// A phone's return key breaks the line; the desktop's sends.
	const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (touch || event.key !== "Enter" || event.shiftKey) return;
		if (event.nativeEvent.isComposing) return;
		event.preventDefault();
		if (sendable && !sending) send();
	};
	const box = cn(BOX_FOCUS, disabled ? BOX_DISABLED : BOX_HOVER, over && OVER);
	// A disabled input keeps its attach act, inert, so the field stands at one
	// x and width in both forms.
	const attach = onAttach ? (
		<FieldDisabled value={disabled === true}>
			<IconButton
				icon="Paperclip"
				fit="bar"
				label={words.attach}
				onAct={() => chooser.current?.click()}
			/>
		</FieldDisabled>
	) : null;
	const chips =
		attachments && attachments.length > 0 ? (
			<Attachments
				attachments={attachments}
				onRemove={onDetach}
				fallback={textField}
			/>
		) : null;
	const textarea = (
		<textarea
			ref={textField}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={keyDown}
			onPaste={onAttach && paste}
			aria-label={words.message}
			placeholder={placeholder}
			disabled={disabled}
			className={cn(fieldValue({ kind: "text" }), MESSAGE_INPUT_VALUE, VALUE)}
		/>
	);
	// On touch Stop and Send are icon acts, so the field keeps its width; Stop's
	// glyph is the stop square in a ring, never a bare square a checkbox would
	// read as.
	let stopAct: ReactNode = null;
	if (working && touch)
		stopAct = (
			<IconButtonBase
				icon="CircleStop"
				fit="bar"
				label={words.stop}
				onClick={stop}
				pending={stopping}
				disabled={!onStop}
			/>
		);
	else if (working)
		stopAct = (
			<ActInert value={!onStop}>
				<ButtonBase
					act="secondary"
					fit="bar"
					label={words.stop}
					onAct={stop}
					pending={stopping}
				/>
			</ActInert>
		);
	const acts = (
		<div
			className={cn(
				touch ? MESSAGE_INPUT_ROW : MESSAGE_INPUT_FOOT,
				touch ? ACTS_ICON : ACTS,
			)}
		>
			{stopAct}
			{touch ? (
				<IconButtonBase
					icon="Send"
					fit="bar"
					label={words.send}
					onClick={send}
					pending={sending}
					disabled={!sendable}
				/>
			) : (
				<ActInert value={!sendable}>
					<ButtonBase
						act="primary"
						fit="bar"
						label={words.send}
						onAct={send}
						pending={sending}
					/>
				</ActInert>
			)}
		</div>
	);
	const act = notice?.act ? (
		<ButtonBase
			act="secondary"
			fit="bar"
			label={notice.act.label}
			onAct={notice.act.onAct}
			failed={notice.act.failed}
			blocked={notice.act.blocked}
		/>
	) : null;
	let input: ReactNode;
	let under: ReactNode = null;
	if (touch) {
		input = (
			<div className={cn(MESSAGE_INPUT_ROW, ROW)}>
				{attach}
				{/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut to the text; the keyboard reaches the text itself */}
				<div
					{...dropping}
					onMouseDown={focusText}
					className={cn(
						field({ fit: "bar", trailing: "none", state: "rest" }),
						MESSAGE_INPUT_FIELD,
						FIELD_BOX,
						box,
					)}
				>
					{chips}
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
			// biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut to the text; the keyboard reaches the text itself
			<div
				{...dropping}
				onMouseDown={focusText}
				className={cn(MESSAGE_INPUT_BOX, STACK, box)}
			>
				{chips ? <div className={MESSAGE_INPUT_CHIPS}>{chips}</div> : null}
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
					<p className={cn(text({ role: "meta" }), NOTICE_TEXT)}>
						{notice.sentence}
					</p>
					{act}
				</div>
			);
	}
	return (
		<div className={cn(MESSAGE_INPUT, ROOT, column)}>
			{onAttach ? (
				<input ref={chooser} type="file" multiple hidden onChange={choose} />
			) : null}
			{input}
			{under}
		</div>
	);
}
