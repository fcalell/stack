import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import { COUNT, field, text } from "@fcalell/ui-core/variants";
import { ArrowUp, Plus, Square } from "lucide-solid";
import { createEffect, For, on, Show } from "solid-js";
import { PINNED, useBarPlacement } from "#lib/bar.ts";
import { Circle } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { useLift } from "#lib/frame.ts";
import { TEXT_ACT } from "#lib/interact.ts";
import { useWords } from "#lib/words.tsx";

// A plus for files, the text in a pill, one circle that sends or stops; the
// notice under it. Dictation is the keyboard's. While `working` the circle
// stops the turn, until there is text to send: a message typed meanwhile is
// sent like any other, and the consumer's notice says when it arrives. As a
// `Screen`'s child it pins to the bottom like an action bar, so a thread
// scrolls under it.
export type MessageInputProps = Closed & {
	value: string;
	onChange: (value: string) => void;
	attachments?: Attachment[];
	onAttach?: () => void;
	placeholder?: string;
	notice?: Notice;
	working?: boolean;
	onSend: () => void;
	onStop?: () => void;
};

export function MessageInput(props: MessageInputProps) {
	const words = useWords();
	const empty = () => props.value.trim().length === 0;
	const placement = useBarPlacement();
	let root!: HTMLDivElement;
	useLift(() => (placement === "pinned" ? root : undefined));
	// The field grows with its text up to its cap, whether the operator typed
	// it or the consumer set it (a prefilled draft, a draft cleared on send).
	let area!: HTMLTextAreaElement;
	createEffect(
		on(
			() => props.value,
			() => {
				area.style.height = "auto";
				area.style.height = `${area.scrollHeight}px`;
			},
		),
	);
	return (
		<div
			ref={root}
			class={cn("flex flex-col gap-row", placement === "pinned" && PINNED)}
		>
			<Show when={props.attachments?.length}>
				<div class="flex flex-wrap gap-pair">
					<For each={props.attachments}>
						{(attachment) => (
							<span class={cn(COUNT, "inline-flex items-center")}>
								{attachment.name}
							</span>
						)}
					</For>
				</div>
			</Show>
			<div class="flex items-end gap-row">
				<Show when={props.onAttach}>
					{(onAttach) => (
						<Circle glyph={Plus} label={words.attach} onAct={onAttach()} />
					)}
				</Show>
				{/* A tap on the field's padding focuses the text. */}
				<div
					class={cn(
						field({ kind: "search", state: "default" }),
						"flex min-w-0 flex-1 items-center focus-within:border-tint",
					)}
					onPointerDown={(event) => {
						if (event.target !== event.currentTarget) return;
						event.preventDefault();
						area.focus();
					}}
				>
					<textarea
						ref={area}
						rows={1}
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => props.onChange(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey && !empty()) {
								event.preventDefault();
								props.onSend();
							}
						}}
						class="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 outline-none placeholder:text-ink-faint"
					/>
				</div>
				<Show
					when={props.working && empty()}
					fallback={
						<Circle
							glyph={ArrowUp}
							label={words.send}
							onAct={props.onSend}
							disabled={empty()}
						/>
					}
				>
					<Circle glyph={Square} label={words.stop} onAct={props.onStop} />
				</Show>
			</div>
			<Show when={props.notice}>
				{(notice) => (
					<div
						class={cn(
							text({ role: "meta" }),
							"flex items-center justify-between gap-row px-inset",
						)}
					>
						<span class="min-w-0 flex-1">{notice().sentence}</span>
						<Show when={notice().act}>
							{(act) => (
								<button
									type="button"
									disabled={act().blocked !== undefined}
									onClick={() => act().onAct()}
									class={cn("min-h-11 shrink-0", TEXT_ACT)}
								>
									{act().label}
								</button>
							)}
						</Show>
					</div>
				)}
			</Show>
		</div>
	);
}
